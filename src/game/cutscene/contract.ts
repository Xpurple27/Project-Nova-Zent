
export type CutsceneEventType="LOCK_CONTROLS"|"UNLOCK_CONTROLS"|"MOVE_ACTOR"|"MOVE_CAMERA"|"SHOW_DIALOGUE"|"PLAY_ANIMATION"|"PLAY_VFX"|"PLAY_SFX"|"SET_MUSIC"|"SET_LIGHTING"|"CAMERA_SHAKE"|"SHOW_TITLE"|"SHOW_BOSS_HUD"|"SCENE_TRANSITION";
export type CutsceneDefinition={id:string;version:string;sceneId:string;durationMs:number;events:Array<{id:string;atMs:number;durationMs?:number;type:CutsceneEventType;payload:Record<string,unknown>}>};
