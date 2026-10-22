import {PLAYER_RADIUS,type Point,type WorldMap,type SceneId} from './model';
export const NAV_GRID=32;
export type MapMarker=Point&{id:string;name:string;local:boolean;color:string};
export const NAV_LANDMARKS:Record<SceneId,{x:number;y:number;label:string}[]>={
 VILLAGE:[{x:560,y:280,label:'Obelisk Delapan Segel'}],FOREST_PATH:[{x:600,y:268,label:'Meridian Akar Retak'}],RUINS_PATH:[{x:650,y:240,label:'Aqueduct Formula'}],ANCIENT_RUINS:[{x:990,y:345,label:'Gerbang Zenith'}],BOSS_CHAMBER:[{x:820,y:390,label:'Mesin Segel Pecah'}]
};
export function walkable(map:WorldMap,p:Point){return p.x>=PLAYER_RADIUS&&p.y>=PLAYER_RADIUS&&p.x<=map.width-PLAYER_RADIUS&&p.y<=map.height-PLAYER_RADIUS&&!map.obstacles.some(r=>p.x+PLAYER_RADIUS>r.x&&p.x-PLAYER_RADIUS<r.x+r.width&&p.y+PLAYER_RADIUS>r.y&&p.y-PLAYER_RADIUS<r.y+r.height);}
export function clearSegment(map:WorldMap,a:Point,b:Point){const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);for(let i=0;i<=steps;i++)if(!walkable(map,{x:a.x+(b.x-a.x)*i/(steps||1),y:a.y+(b.y-a.y)*i/(steps||1)}))return false;return true;}
/** Local guidance only, with the same expanded obstacles as movement. Bounded breadth-first grid search. */
export function routeTo(map:WorldMap,from:Point,to:Point):Point[]{
 if(!walkable(map,from)||!walkable(map,to))return [];
 if(clearSegment(map,from,to))return [from,to];
 const cols=Math.floor(map.width/NAV_GRID),rows=Math.floor(map.height/NAV_GRID),point=(i:number)=>({x:(i%cols+.5)*NAV_GRID,y:(Math.floor(i/cols)+.5)*NAV_GRID});
 const cell=(p:Point)=>Math.floor(p.y/NAV_GRID)*cols+Math.floor(p.x/NAV_GRID);
 const nearest=(p:Point)=>Array.from({length:cols*rows},(_,i)=>i).filter(i=>walkable(map,point(i))&&Math.abs(point(i).x-p.x)<NAV_GRID*2&&Math.abs(point(i).y-p.y)<NAV_GRID*2&&clearSegment(map,p,point(i))).sort((a,b)=>Math.hypot(point(a).x-p.x,point(a).y-p.y)-Math.hypot(point(b).x-p.x,point(b).y-p.y))[0];
 const start=walkable(map,point(cell(from)))&&clearSegment(map,from,point(cell(from)))?cell(from):nearest(from),goal=nearest(to);if(start===undefined||goal===undefined)return [];
 const queue=[start],parent=new Map<number,number>([[start,-1]]);let at=0;
 while(at<queue.length){const id=queue[at++];if(id===goal)break;const x=id%cols,y=Math.floor(id/cols);for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||parent.has(n)||!walkable(map,point(n))||!clearSegment(map,point(id),point(n)))continue;parent.set(n,id);queue.push(n);}}
 if(!parent.has(goal))return [];
 const path:Point[]=[];for(let id=goal;id!==-1;id=parent.get(id)!)path.unshift(point(id));path.unshift(from);path.push(to);
 // Line-of-sight simplification never cuts a collision corner.
 const out=[path[0]];let i=0;while(i<path.length-1){let next=path.length-1;while(next>i+1&&!clearSegment(map,path[i],path[next]))next--;out.push(path[next]);i=next;}return out;
}
export function bearing(from:Point,to:Point){const x=to.x-from.x,y=to.y-from.y;if(Math.hypot(x,y)<50)return 'Sudah dekat';if(Math.abs(x)>Math.abs(y)*1.5)return x>0?'Timur →':'Barat ←';if(Math.abs(y)>Math.abs(x)*1.5)return y>0?'Selatan ↓':'Utara ↑';return y>0?x>0?'Tenggara ↘':'Barat daya ↙':x>0?'Timur laut ↗':'Barat laut ↖';}
