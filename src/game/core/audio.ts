
export type SoundCue="correct"|"failed"|"attack"|"heal"|"block"|"boss_roar"|"heavy_warning"|"victory"|"defeat";
export interface AudioPort{readonly muted:boolean;play(cue:SoundCue):void;setMuted(muted:boolean):void;subscribe(handler:(cue:SoundCue)=>void):()=>void}
export function createAudioManager():AudioPort{
 let muted=true;const handlers=new Set<(cue:SoundCue)=>void>();
 return {get muted(){return muted;},setMuted(value){muted=value;},play(cue){if(!muted)handlers.forEach(handler=>handler(cue));},subscribe(handler){handlers.add(handler);return ()=>{handlers.delete(handler);};}};
}
