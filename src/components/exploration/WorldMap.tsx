'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {MAPS,SCENES,type Point,type SceneId} from '@/game/exploration/model';
import {bearing,NAV_LANDMARKS,routeTo,type MapMarker} from '@/game/exploration/navigation';
function MapDrawing({scene,position,markers,detail=false}:{scene:SceneId;position:Point;markers:MapMarker[];detail?:boolean}){
 const map=MAPS[scene],exit=map.zones.find(z=>z.id==='exit')!,qx=Math.round(position.x/16)*16,qy=Math.round(position.y/16)*16;
 const route=useMemo(()=>routeTo(map,{x:qx,y:qy},exit),[map,qx,qy,exit]);
 return <svg className="navigation-map" viewBox={`0 0 ${map.width} ${map.height}`} role="img" aria-label={`Denah ${map.name}; posisi kamu, rekan, jalur dan tujuan`}>
  <rect width={map.width} height={map.height} rx="25" fill="#15272e"/><path d="M60 384H1090" stroke="#948769" strokeWidth="105" opacity=".35"/>
  {map.obstacles.map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} rx={r.kind==='TREE'?20:5} fill={r.kind==='TREE'?'#43796c':r.kind==='HOUSE'?'#8c7e90':'#8a819c'} stroke="#c0bfa6" strokeWidth="3"/>)}
  {route.length>0&&<polyline points={route.map(p=>p.x+','+p.y).join(' ')} fill="none" stroke="#d6dcad" strokeWidth={detail?5:8} strokeDasharray="18 12"/>}
  {NAV_LANDMARKS[scene].map(l=><g key={l.label}><path d={`M${l.x} ${l.y-30}l20 30-20 28-20-28Z`} fill="#bda6db" stroke="#ede0b8" strokeWidth="4"/>{detail&&<text x={l.x} y={l.y-45} textAnchor="middle" fill="#eee4f6" fontSize="24">{l.label}</text>}</g>)}
  {map.zones.map(z=><g key={z.id}><circle cx={z.x} cy={z.y} r={z.id==='exit'?30:19} fill={z.id==='exit'?'#eac58b':'#b8a6e5'} stroke="#172434" strokeWidth="6"/>{detail&&<text x={z.x} y={z.y+57} textAnchor={z.x>map.width-220?'end':'middle'} fill="#f2e6d3" fontSize="23">{z.label}</text>}</g>)}
  {markers.filter(m=>!m.local).map(m=><circle key={m.id} cx={m.x} cy={m.y} r="17" fill={m.color} stroke="#111d29" strokeWidth="5"><title>{m.name}</title></circle>)}
  <circle cx={position.x} cy={position.y} r="24" fill="#f8f5df" stroke="#63d8c7" strokeWidth="8"><title>Kamu</title></circle>
  <text x="42" y="52" fontSize="33" fill="#e7ddbc">N ↑</text>
 </svg>;
}
export default function WorldMap({scene,position,markers,locked,onOpenChange}:{scene:SceneId;position?:Point;markers:MapMarker[];locked:boolean;onOpenChange:(open:boolean)=>void}){
 const [open,setOpen]=useState(false),[expanded,setExpanded]=useState(true),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),map=MAPS[scene],p=position??map.spawn,exit=map.zones.find(z=>z.id==='exit')!;
 useEffect(()=>{onOpenChange(open);},[open,onOpenChange]);
 // React owns open; a delayed native close event must never cancel a subsequent reopen.
 useEffect(()=>{const element=dialog.current;if(!element)return;if(open&&!element.open)element.showModal();else if(!open&&element.open)element.close();},[open]);
 useEffect(()=>{const keyboard=(e:KeyboardEvent)=>{const tag=(e.target as HTMLElement)?.tagName;if(e.key.toLowerCase()==='m'&&!e.repeat&&!locked&&!['INPUT','SELECT','TEXTAREA'].includes(tag)){e.preventDefault();setOpen(value=>!value);}};window.addEventListener('keydown',keyboard);return()=>window.removeEventListener('keydown',keyboard);},[locked]);
 useEffect(()=>{if(locked)setOpen(false);},[locked]);
 function close(){setOpen(false);trigger.current?.focus();}
 return <aside className="world-navigation" aria-label="Navigasi lokasi" hidden={locked}>
  <div className="minimap-actions"><button type="button" aria-label={expanded?'Sembunyikan minimap':'Tampilkan minimap'} onClick={()=>setExpanded(v=>!v)}>{expanded?'−':'+'}</button><button ref={trigger} type="button" onClick={()=>setOpen(true)}>Peta <span aria-hidden>▧</span></button></div>
  {expanded&&<><MapDrawing scene={scene} position={p} markers={markers}/><span className="bearing-label">{bearing(p,exit)}</span></>}
  <dialog ref={dialog} className="world-map-dialog" aria-labelledby="world-map-title" onCancel={e=>{e.preventDefault();close();}}>
   <div className="map-dialog-heading"><div><p className="eyebrow">PETA EKSPEDISI</p><h2 id="world-map-title">{map.name}</h2></div><button className="button small secondary" onClick={close}>Tutup peta</button></div>
   <MapDrawing scene={scene} position={p} markers={markers} detail/><p className="map-key">● Kamu · titik berwarna: rekan · emas: tujuan · ungu: petunjuk/landmark</p><p className="map-destination">Tujuan: <strong>{exit.label}</strong> · {bearing(p,exit)}</p>
   <ol className="expedition-route">{SCENES.map(id=><li key={id} aria-current={id===scene?'step':undefined}>{MAPS[id].name}</li>)}</ol><p className="muted">Ikuti jalur putus-putus, lalu gunakan Interaksi dan kumpulkan party di tujuan.</p>
  </dialog>
 </aside>;
}
