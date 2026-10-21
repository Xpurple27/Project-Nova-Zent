import type {SceneId,Direction} from '../exploration/model';
export type StoryId='opening'|'encounter-1'|'encounter-2'|'boss-entrance'|'ending';
type At={id:string;atMs:number;durationMs?:number};
export type StoryCommand=At&(
 {type:'lockControls'|'unlockControls'|'fadeIn'|'fadeOut';value?:number}|
 {type:'cameraPan';x:number;y:number}|{type:'cameraZoom';zoom:number}|
 {type:'moveActor';actor:'WARRIOR'|'MAGE'|'THIEF'|'HEALER'|'boss';x:number;y:number}|
 {type:'faceDirection';actor:string;direction:Direction}|
 {type:'playAnimation';actor:string;animation:string}|
 {type:'showDialogue';speaker:string;portrait:string;text:string;expression?:string}|
 {type:'wait'}|{type:'playSfx'|'changeMusic'|'spawnVfx'|'triggerEvent';cue:string}|
 {type:'shakeCamera';strength:'small'|'medium'|'heavy'}|{type:'showTitle';title:string}|
 {type:'transitionScene';scene:SceneId});
export type StoryDefinition={id:StoryId;version:1;scene:SceneId;durationMs:number;steps:StoryCommand[]};
const dialogue=(id:string,atMs:number,speaker:string,text:string,durationMs=6000):StoryCommand=>({id,atMs,type:'showDialogue',speaker,portrait:speaker.toLowerCase(),text,durationMs});
export const STORIES:Record<StoryId,StoryDefinition>={
 opening:{id:'opening',version:1,scene:'VILLAGE',durationMs:48000,steps:[
  {id:'lock',atMs:0,type:'lockControls'},{id:'music',atMs:0,type:'changeMusic',cue:'village'},
  {id:'pan',atMs:0,type:'cameraPan',x:560,y:380,durationMs:2500},
  dialogue('seals',1000,'Penjaga Segel','Delapan Segel Arcane menjaga NOVA ZENITH. Angka, pola, dan proporsi menahan Abyss.'),
  {id:'dark',atMs:8000,type:'spawnVfx',cue:'abyss-disturbance',durationMs:3000},{id:'quake',atMs:8500,type:'shakeCamera',strength:'medium'},
  dialogue('incident',9000,'Penjaga Segel','Segel desa retak! Mereka membawa penjaga formula ke reruntuhan!'),
  {id:'warrior',atMs:16000,type:'playAnimation',actor:'WARRIOR',animation:'shield',durationMs:800},
  dialogue('protect',16000,'Warrior','Berlindung di belakangku. Kita kejar mereka.'),
  {id:'mage',atMs:22000,type:'playAnimation',actor:'MAGE',animation:'arcaneCast',durationMs:900},
  dialogue('trace',22000,'Mage','Jejak rune ini menuju Ancient Ruins. Formulanya belum padam.'),
  {id:'thief',atMs:28000,type:'moveActor',actor:'THIEF',x:250,y:350,durationMs:900},
  dialogue('path',28000,'Thief','Aku tahu jalur hutan. Tetap berdekatan.'),
  {id:'healer',atMs:34000,type:'playAnimation',actor:'HEALER',animation:'blessing',durationMs:900},
  dialogue('vow',34000,'Healer','Kita pulangkan penjaga itu dan perbaiki segelnya bersama.'),
  dialogue('quest',41000,'Penjaga Segel','Ikuti rune ke timur. Gabungkan Arcane Formula kalian.',6000),
  {id:'end',atMs:47500,type:'unlockControls'}]},
 'encounter-1':{id:'encounter-1',version:1,scene:'FOREST_PATH',durationMs:4000,steps:[{id:'lock',atMs:0,type:'lockControls'},dialogue('hound',0,'Warrior','Shadow Hound menjaga jalur. Siapkan formula dan lindungi party.',4000)]},
 'encounter-2':{id:'encounter-2',version:1,scene:'RUINS_PATH',durationMs:4000,steps:[{id:'lock',atMs:0,type:'lockControls'},dialogue('shaman',0,'Mage','Corrupted Shaman memperkuat dirinya. Perhatikan buff dan gelombang serangannya.',4000)]},
 'boss-entrance':{id:'boss-entrance',version:1,scene:'BOSS_CHAMBER',durationMs:12000,steps:[
  {id:'lock',atMs:0,type:'lockControls'},{id:'silence',atMs:0,type:'changeMusic',cue:'ruins'},
  {id:'pan',atMs:0,type:'cameraPan',x:840,y:380,durationMs:1400},{id:'dark',atMs:1500,type:'fadeOut',value:.6,durationMs:700},
  {id:'silhouette',atMs:2200,type:'spawnVfx',cue:'guardian-silhouette',durationMs:6000},
  {id:'cracks',atMs:3200,type:'spawnVfx',cue:'stone-cracks',durationMs:2000},
  {id:'awake',atMs:4200,type:'playAnimation',actor:'boss',animation:'entrance',durationMs:2000},
  {id:'roar',atMs:6400,type:'playSfx',cue:'boss_roar'},{id:'shake',atMs:6500,type:'shakeCamera',strength:'heavy'},
  {id:'title',atMs:7400,type:'showTitle',title:'ABYSS GUARDIAN',durationMs:3000},
  {id:'hud',atMs:10800,type:'triggerEvent',cue:'show-boss-hud'},{id:'music',atMs:11000,type:'changeMusic',cue:'boss-combat'}]},
 ending:{id:'ending',version:1,scene:'BOSS_CHAMBER',durationMs:14000,steps:[
  {id:'lock',atMs:0,type:'lockControls'},{id:'fallen',atMs:0,type:'playAnimation',actor:'boss',animation:'death',durationMs:2000},
  {id:'calm',atMs:2000,type:'changeMusic',cue:'victory'},
  dialogue('clue',2500,'Mage','Di balik batu ini… ada tujuh tanda lain. Segel ini hanya pintu pertama.',5000),
  dialogue('servant',8000,'Suara dari Abyss','The creature you defeated was merely a servant.',6000)]}
};
