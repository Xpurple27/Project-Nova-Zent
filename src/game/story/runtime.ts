import {STORIES,type StoryId,type StoryCommand} from './definitions';
export type StoryState={id:StoryId;version:1;instanceId:string;startedAt:number;endsAt:number;step:number;skipVotes:string[]};
export type StoryFrame={elapsed:number;commands:StoryCommand[];dialogue:Extract<StoryCommand,{type:'showDialogue'}>|null;title:string|null};
export function storyFrame(story:StoryState,now:number):StoryFrame{
 const def=STORIES[story.id],elapsed=Math.max(0,Math.min(def.durationMs,now-story.startedAt));
 const commands=def.steps.filter(s=>s.atMs<=elapsed&&(s.durationMs===undefined||elapsed<s.atMs+s.durationMs));
 const dialogue=[...commands].reverse().find((s):s is Extract<StoryCommand,{type:'showDialogue'}>=>s.type==='showDialogue')??null;
 return {elapsed,commands,dialogue,title:commands.find(s=>s.type==='showTitle')?.title??null};
}
/** Monotonic visual cursor; reconnect seeks current logical time, never replays old SFX. */
export class StoryCursor{
 private through=-1;
 seek(story:StoryState,now:number){this.through=Math.max(0,now-story.startedAt);}
 consume(story:StoryState,now:number){const elapsed=Math.max(0,now-story.startedAt),steps=STORIES[story.id].steps.filter(s=>s.atMs>this.through&&s.atMs<=elapsed);this.through=Math.max(this.through,elapsed);return steps;}
}
export function skipComplete(active:string[],votes:string[]){return active.length>0&&active.every(id=>votes.includes(id));}
