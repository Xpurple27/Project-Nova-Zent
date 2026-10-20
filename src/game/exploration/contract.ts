
/** Future Phaser integration. No exploration implementation in High 1–5. */
export type ExplorationIntent={type:"RALLY_INTENT";stageId:string}|{type:"INTERACT_INTENT";objectId:string}|{type:"LOCAL_MOTION";sceneId:string;x:number;y:number;seq:number};
export type WorldCommand={type:"SCENE_LOAD";sceneId:string}|{type:"INPUT_LOCK";locked:boolean}|{type:"WORLD_CHECKPOINT_APPLY";stageId:string};
