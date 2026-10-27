/** Shared text/TeX delimiter contract. This module contains no questions or answer keys. */
export type MathPart = {kind:'text';source:string}|{kind:'math';source:string;display:boolean};
const delimiters=[['$$','$$',true],['\\[','\\]',true],['\\(','\\)',false],['$','$',false]] as const;

function escaped(source:string,position:number){
 let slashes=0;
 for(let i=position-1;i>=0&&source[i]==='\\';i--)slashes++;
 return slashes%2===1;
}

/** Tolerant display keeps malformed content readable. Publication uses strict mode. */
export function splitMathText(source:string,strict=false):MathPart[]{
 const parts:MathPart[]=[];let cursor=0,textStart=0;
 while(cursor<source.length){
  const delimiter=delimiters.find(([left])=>source.startsWith(left,cursor)&&!escaped(source,cursor));
  if(!delimiter){
   if(strict&&!escaped(source,cursor)&&(source.startsWith('\\)',cursor)||source.startsWith('\\]',cursor)))throw Error('INVALID_MATH_DELIMITER');
   cursor++;continue;
  }
  const [left,right,display]=delimiter;let end=source.indexOf(right,cursor+left.length);
  while(end>=0&&escaped(source,end))end=source.indexOf(right,end+right.length);
  if(end<0||end===cursor+left.length){
   if(strict)throw Error('INVALID_MATH_DELIMITER');
   cursor+=left.length;continue;
  }
  if(cursor>textStart)parts.push({kind:'text',source:source.slice(textStart,cursor)});
  parts.push({kind:'math',source:source.slice(cursor+left.length,end),display});
  cursor=end+right.length;textStart=cursor;
 }
 if(textStart<source.length)parts.push({kind:'text',source:source.slice(textStart)});
 return parts;
}
