import type {StoryState} from '../story/runtime';
import type {CharacterClass} from '../core/types';
import type {InteractionZone,Motion,Point,SceneId} from './model';
export type Explorer={id:string;userId:string;name:string;classId:CharacterClass;seat:number};
export type ExplorationView={scene:SceneId;sceneToken:string;locked:boolean;story?:{state:StoryState;now:number};party:Explorer[];localId:string};
export interface ExplorationPort{
 view:ExplorationView;axis:Point;remotes:Map<string,Motion>;
 onCue?:(kind:'sfx'|'music'|'vfx'|'event',cue:string)=>void;onMotion:(motion:Motion)=>void;onZone:(zone:InteractionZone|null)=>void;onPosition?:(position:Point)=>void;
}
