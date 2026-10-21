/** Canonical exploration bridge. Presentation never owns room/progression/combat truth. */
export type {ExplorationPort,ExplorationView,Explorer} from './bridge';
export type {SceneId,InteractionZone,Motion,Point,WorldMap} from './model';
export type ExplorationIntent={type:'RALLY_INTENT';ready:boolean;phaseId:string;sceneToken:string}|{type:'INTERACT_INTENT';zoneId:string;sceneToken:string}|{type:'LOCAL_MOTION';motion:import('./model').Motion};
export type WorldCommand={type:'APPLY_VIEW';view:import('./bridge').ExplorationView}|{type:'DESTROY'};
