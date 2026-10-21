'use client';
import {storyFrame,type StoryState} from '@/game/story/runtime';
export default function StoryOverlay({story,now,activeIds,working,onSkip}:{story:StoryState;now:number;activeIds:string[];working:boolean;onSkip:()=>void}){
 const frame=storyFrame(story,now),dialogue=frame.dialogue;
 return <section className={'story-overlay story-'+story.id} aria-label="Story sequence">
  {frame.title&&<div className="story-title" role="status">{frame.title}</div>}
  <div className="story-dialogue" role="region" aria-label="Dialogue"><div className="story-portrait" aria-hidden>✦</div><div><p className="eyebrow">{dialogue?.speaker??'NOVA ZENITH'}</p><p className="dialogue-text">{dialogue?.text??(story.id==='boss-entrance'?'Batu kuno bergetar. Sesuatu terbangun di balik segel…':'Arcane Formula beresonansi…')}</p><small>Lanjut otomatis · {Math.max(0,Math.ceil((story.endsAt-now)/1000))}s</small></div><button className="button small secondary" disabled={working} onClick={onSkip}>Skip {story.skipVotes.filter(id=>activeIds.includes(id)).length}/{activeIds.length}</button></div>
 </section>;
}
