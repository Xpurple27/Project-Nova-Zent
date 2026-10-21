import type {EnemyId} from '../enemies/definitions';
import {STORIES,type StoryId} from '../story/definitions';
import {skipComplete,type StoryState} from '../story/runtime';
/** Server-only logical progression. Motion is deliberately absent. */
import type {Authority,Context} from '../multiplayer/server/authority';
import type {Intent} from '../multiplayer/protocol';
import {GAME} from '../config';
import {event} from '../boss/engine';
import {SCENES,type SceneId} from './model';
export type Campaign={version:1;scene:SceneId;sceneToken:string;completed:string[];rally:string[];activeIds:string[];encounter:string|null;emptySince?:number;story?:StoryState;completedStories?:string[]};
export const worldPhase=(d:Authority)=>!!d.campaign&&['EXPLORATION','STORY','ENDING','COMPLETED'].includes(d.phase);
export function activeParty(d:Authority,c:Context){return c.members.filter(m=>!m.left&&!d.departed.includes(m.id)&&c.now-m.lastSeen<GAME.reconnectGraceMs).map(m=>m.id);}
export function enterWorld(d:Authority,c:Context,scene:SceneId){
 const campaign=d.campaign!;campaign.scene=scene;campaign.sceneToken=c.id();campaign.rally=[];campaign.activeIds=activeParty(d,c);campaign.encounter=null;
 d.phase='EXPLORATION';d.phaseId=c.id();d.openedAt=c.now;d.deadline=c.now+5000;d.actors=[];d.intent=null;
 event(d.engine,'SCENE_ENTERED',scene);
}
export function startCampaign(d:Authority,c:Context){d.campaign={version:1,scene:'VILLAGE',sceneToken:c.id(),completed:[],rally:[],activeIds:[],encounter:null,completedStories:[]};enterWorld(d,c,'VILLAGE');beginStory(d,c,'opening');return d;}
export function beginStory(d:Authority,c:Context,id:StoryId){
 const campaign=d.campaign!,def=STORIES[id];campaign.story={id,version:1,instanceId:c.id(),startedAt:c.now,endsAt:c.now+def.durationMs,step:0,skipVotes:[]};campaign.activeIds=activeParty(d,c);d.phase=id==='ending'?'ENDING':'STORY';d.phaseId=c.id();d.openedAt=c.now;d.deadline=Math.min(c.now+5000,campaign.story.endsAt);event(d.engine,'CUTSCENE_STARTED',id);
}
export function completeStory(d:Authority,c:Context,onEncounter:(id:EnemyId)=>void){const campaign=d.campaign!,story=campaign.story!;campaign.completedStories=[...new Set([...(campaign.completedStories??[]),story.id])];delete campaign.story;event(d.engine,'CUTSCENE_COMPLETED',story.id);if(story.id==='ending'){d.phase='COMPLETED';d.phaseId=c.id();d.deadline=null;return d;}if(story.id==='opening'){enterWorld(d,c,'VILLAGE');return d;}onEncounter(story.id==='encounter-1'?'shadow-hound':story.id==='encounter-2'?'corrupted-shaman':'abyss-guardian');return d;}
export function applyWorld(d:Authority,uid:string,intent:Intent,c:Context):Authority{
 const m=c.members.find(m=>m.userId===uid);if(!m||!activeParty(d,c).includes(m.id))throw Error('INACTIVE_ACTOR');
 if(intent.kind==='SKIP'){if(!d.campaign?.story||intent.phaseId!==d.phaseId||intent.storyInstance!==d.campaign.story.instanceId)throw Error('STALE_PHASE');d.campaign.story.skipVotes=[...new Set([...d.campaign.story.skipVotes,m.id])];d.deadline=c.now;return d;}
 if(intent.kind!=='RALLY'||!d.campaign||d.phase!=='EXPLORATION')throw Error('INVALID_PHASE');
 if(intent.phaseId!==d.phaseId||intent.sceneToken!==d.campaign.sceneToken)throw Error('STALE_PHASE');
 const a=d.campaign.rally;d.campaign.rally=intent.ready?[...new Set([...a,m.id])]:a.filter(id=>id!==m.id);d.deadline=c.now;return d;
}
export function advanceWorld(d:Authority,c:Context,onEncounter:(id:EnemyId)=>void){
 if(d.campaign?.story){const story=d.campaign.story;d.campaign.activeIds=activeParty(d,c);story.step=STORIES[story.id].steps.filter(s=>s.atMs<=c.now-story.startedAt).length;if(c.now>=story.endsAt||skipComplete(d.campaign.activeIds,story.skipVotes))return completeStory(d,c,onEncounter);d.deadline=Math.min(story.endsAt,c.now+5000);return d;}
 if(d.phase!=='EXPLORATION')return d;
 const campaign=d.campaign!;campaign.activeIds=activeParty(d,c);d.deadline=c.now+5000;
 if(!campaign.activeIds.length){campaign.emptySince??=c.now;if(c.now-campaign.emptySince>=600000){d.phase='ABORTED';d.phaseId=c.id();d.deadline=null;event(d.engine,'EXPEDITION_ABORTED','No adventurers returned within ten minutes.');}else d.deadline=c.now+30000;return d;}delete campaign.emptySince;
 if(!campaign.activeIds.length||!campaign.activeIds.every(id=>campaign.rally.includes(id)))return d;
 if(campaign.scene==='FOREST_PATH'||campaign.scene==='RUINS_PATH'||campaign.scene==='BOSS_CHAMBER'){
  if(campaign.scene==='RUINS_PATH'&&!campaign.completed.includes('shadow-hound')||campaign.scene==='BOSS_CHAMBER'&&!campaign.completed.includes('corrupted-shaman'))throw Error('INVALID_PROGRESSION');
  campaign.rally=[];beginStory(d,c,campaign.scene==='FOREST_PATH'?'encounter-1':campaign.scene==='RUINS_PATH'?'encounter-2':'boss-entrance');return d;
 }
 const index=SCENES.indexOf(campaign.scene);enterWorld(d,c,SCENES[index+1]);return d;
}

export function encounterWon(d:Authority,c:Context){
 const campaign=d.campaign!,id=campaign.encounter;if(!id||campaign.completed.includes(id))return;
 campaign.completed.push(id);event(d.engine,'ENCOUNTER_COMPLETED',id);
 if(id==='abyss-guardian'){beginStory(d,c,'ending');return;}
 for(const p of d.engine.party){p.hp=p.maxHp;p.resource=40;p.ultimate=Math.min(50,p.ultimate);}d.engine.effects=[];
 enterWorld(d,c,id==='shadow-hound'?'RUINS_PATH':'ANCIENT_RUINS');
}
