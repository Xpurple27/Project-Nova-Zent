'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {GameAudio} from '@/game/audio/engine';
import {DEFAULT_AUDIO,type AudioSettings} from '@/game/audio/model';
const AudioContext=createContext<GameAudio|null>(null);
export const useGameAudio=()=>useContext(AudioContext);
export default function AudioProvider({children}:{children:React.ReactNode}){
 const [engine]=useState(()=>new GameAudio()),[settings,setSettings]=useState<AudioSettings>({...DEFAULT_AUDIO}),[status,setStatus]=useState('Audio off');const path=usePathname();
 useEffect(()=>{engine.restore();setSettings(engine.settings);const visible=()=>engine.visibility(document.hidden);document.addEventListener('visibilitychange',visible);return()=>{document.removeEventListener('visibilitychange',visible);engine.dispose();};},[engine]);
 useEffect(()=>{if(path==='/'||path==='/lobby')engine.music('lobby');},[path,engine]);
 function update(next:AudioSettings){engine.update(next);setSettings({...engine.settings});}
 return <AudioContext.Provider value={engine}>{children}<details className="audio-settings"><summary>♫ Audio settings</summary><button className="button secondary" onClick={()=>{void engine.unlock().then(ok=>{if(ok){update({...engine.settings,muted:!engine.settings.muted});setStatus(engine.settings.muted?'Audio muted':'Audio enabled');}else setStatus('Audio belum tersedia. Ketuk untuk mencoba kembali.');});}}>{settings.muted?'Aktifkan audio':'Mute'}</button>{(['master','music','sfx'] as const).map(key=><label key={key}>{key==='master'?'Master volume':key==='music'?'Music volume':'SFX volume'}<input type="range" min="0" max="1" step=".05" value={settings[key]} onChange={e=>update({...settings,[key]:Number(e.target.value)})}/></label>)}<p role="status">{status}</p></details></AudioContext.Provider>;
}
