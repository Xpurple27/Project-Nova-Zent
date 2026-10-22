'use client';
import WorldMap from './WorldMap';
import type {MapMarker} from '@/game/exploration/navigation';
import {useGameAudio} from '../audio/AudioProvider';
import {useEffect,useRef,useState} from 'react';
import type {ExplorationPort,ExplorationView} from '@/game/exploration/bridge';
import {MAPS,type InteractionZone,type Motion,type Point} from '@/game/exploration/model';
export default function Exploration({view,onInteract,network}:{view:ExplorationView;onInteract:(zone:string)=>void;network?:(receive:(id:string,m:Motion)=>void)=>{send:(m:Motion)=>void;close:()=>void}}){
 const audio=useGameAudio();
 const host=useRef<HTMLDivElement>(null),port=useRef<ExplorationPort|null>(null);const [zone,setZone]=useState<InteractionZone|null>(null),[error,setError]=useState(''),[position,setPosition]=useState<Point>(),[markers,setMarkers]=useState<MapMarker[]>([]),[mapOpen,setMapOpen]=useState(false);
 useEffect(()=>{
  setZone(null);setPosition(undefined);setMarkers([]);setMapOpen(false);
  let alive=true,renderer:{destroy:()=>void}|undefined;
  const p:ExplorationPort={view,axis:{x:0,y:0},remotes:new Map(),onCue:(kind,cue)=>{if(kind==='sfx')audio?.play(cue);if(kind==='music')audio?.music(cue as import('@/game/audio/model').MusicState);},onMapMarkers:v=>{if(alive)setMarkers(v);},onMotion:()=>{},onZone:z=>{if(alive)setZone(z);},onPosition:v=>{if(alive)setPosition(v);}};port.current=p;
  const sync=network?.((id,m)=>p.remotes.set(id,m));p.onMotion=m=>sync?.send(m);
  void import('@/game/exploration/phaser').then(module=>{if(alive&&host.current)renderer=module.mountExploration(host.current,p);}).catch(()=>{if(alive)setError('Map tidak dapat dimuat. Muat ulang halaman untuk mencoba kembali.');});
  const release=()=>{p.axis={x:0,y:0};};window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
  return()=>{alive=false;sync?.close();renderer?.destroy();port.current=null;window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);};
  // A durable sceneToken remounts the renderer at a safe checkpoint. Mutable inputs stay in the port.
 },[view.sceneToken,network]);
 useEffect(()=>{if(port.current)port.current.view={...view,locked:view.locked||mapOpen};if(mapOpen&&port.current)port.current.axis={x:0,y:0};},[view,mapOpen]);
 function axis(value:Point){if(port.current)port.current.axis=value;}
 return <section className="world-panel" aria-label={MAPS[view.scene].name}>
  <div className="world-objective"><strong>{MAPS[view.scene].name}</strong><span>Ikuti jalan ke timur → • WASD / panah • Berkumpul di rune keluar</span></div>
  <div className="world-canvas" ref={host} role="img" aria-label="Peta exploration; gunakan tombol arah dan interaksi" data-scene-token={view.sceneToken} data-position={position?`${Math.round(position.x)},${Math.round(position.y)}`:''}/>
  <WorldMap key={view.sceneToken} scene={view.scene} position={position} markers={markers} locked={view.locked} onOpenChange={setMapOpen}/>
  {error&&<p role="alert">{error}</p>}
  <div className="world-controls"><div className="direction-pad" aria-label="Movement controls">{([{name:'Atas',x:0,y:-1},{name:'Kiri',x:-1,y:0},{name:'Bawah',x:0,y:1},{name:'Kanan',x:1,y:0}]).map(v=><button key={v.name} aria-label={v.name} disabled={view.locked||mapOpen} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);axis(v);}} onPointerUp={()=>axis({x:0,y:0})} onPointerCancel={()=>axis({x:0,y:0})} onLostPointerCapture={()=>axis({x:0,y:0})} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();axis(v);}}} onKeyUp={()=>axis({x:0,y:0})}>{v.name==='Atas'?'↑':v.name==='Kiri'?'←':v.name==='Bawah'?'↓':'→'}</button>)}</div><button className="button primary interact" disabled={!zone||view.locked||mapOpen} onClick={()=>zone&&onInteract(zone.id)}>{zone?.label??'Dekati rune'} <span>✦</span></button></div>
 </section>;
}
