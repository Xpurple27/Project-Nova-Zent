/** Mechanical atlas extraction/normalization only. Art is generated with built-in imagegen. */
import sharp from 'sharp';import fs from 'node:fs/promises';
const input=JSON.parse(await fs.readFile(process.argv[2]??'.qa/chibi-input.json','utf8'));
await fs.mkdir('public/assets/chibi',{recursive:true});await fs.mkdir('public/assets/environment/painted',{recursive:true});
const heroes=['warrior','mage','thief','healer'];
for(const a of input.assets){
 const hero=heroes.includes(a.id),enemy=['hound','shaman','guardian'].includes(a.id);
 if(!hero&&!enemy){await sharp(a.path).resize(1152,768,{fit:'fill'}).webp({quality:88}).toFile('public/assets/environment/painted/'+a.id+'.webp');continue;}
 const rows=hero?6:a.id==='guardian'?4:3,frame=hero?192:256,m=await sharp(a.path).metadata(),cells=[];
 for(let row=0;row<rows;row++)for(let col=0;col<4;col++){
  const left=Math.round(col*m.width/4),top=Math.round(row*m.height/rows),right=Math.round((col+1)*m.width/4),bottom=Math.round((row+1)*m.height/rows);
  cells.push(await sharp(a.path).extract({left,top,width:right-left,height:bottom-top}).resize(frame,frame).png().toBuffer());
 }
 await sharp({create:{width:frame*4,height:frame*rows,channels:4,background:'#00000000'}}).composite(cells.map((input,i)=>({input,left:i%4*frame,top:Math.floor(i/4)*frame}))).webp({quality:91,alphaQuality:100}).toFile('public/assets/chibi/'+a.id+'-atlas.webp');
 if(!hero)await sharp('public/assets/chibi/'+a.id+'-atlas.webp').extract({left:0,top:0,width:256,height:256}).resize(192,192).webp({quality:93,alphaQuality:100}).toFile('public/assets/chibi/'+a.id+'-idle.webp');
 if(hero){
  await sharp(cells[0]).webp({quality:94,alphaQuality:100}).toFile('public/assets/chibi/'+a.id+'-idle.webp');
  await sharp(cells[0]).extract({left:35,top:8,width:122,height:122}).resize(256,256).webp({quality:93,alphaQuality:100}).toFile('public/assets/chibi/'+a.id+'-portrait.webp');
  const pieces=[];
  for(let row=0;row<8;row++)for(let col=0;col<4;col++){
   const sourceRow=row<2?2:row<6?1:3,id=sourceRow*4+(row%2?col:0),flip=row===2||row===3;
   let image=sharp(cells[id]);if(flip)image=image.flop();
   const buffer=await image.resize(96,112,{fit:'contain',background:'#00000000'}).png().toBuffer();pieces.push({input:buffer,left:col*96,top:row*128+10});
  }
  await sharp({create:{width:384,height:1024,channels:4,background:'#00000000'}}).composite(pieces).webp({quality:90,alphaQuality:100}).toFile('public/assets/chibi/'+a.id+'-world.webp');
 }else if(a.id==='guardian'){
  const select=[0,0,0,0,0,8,10,0,0,8,10,11,12,13,14,15];
  await sharp({create:{width:768,height:768,channels:4,background:'#00000000'}}).composite(await Promise.all(select.map(async(i,n)=>({input:await sharp(cells[i]).resize(192,192).png().toBuffer(),left:n%4*192,top:Math.floor(n/4)*192})))).webp({quality:91,alphaQuality:100}).toFile('public/assets/chibi/guardian-story.webp');
 }
}
await fs.mkdir('docs/art',{recursive:true});
await fs.writeFile('docs/art/CHIBI_PAINTED_PROMPTS.json',JSON.stringify({generator:'Built-in image_gen.imagegen',created:'2026-10-22',intent:'User-requested illustrated chibi likeness, painted environments and readable enemy deaths',...input.prompts},null,2)+'\n');
console.log('Packed 7 painted actor atlases, 4 world sheets, 4 idle/portrait pairs, Guardian story and 5 backgrounds.');
