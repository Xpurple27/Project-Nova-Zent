
export type AnimationName="idle"|"walk"|"attack"|"cast"|"shield"|"heal"|"dodge"|"hurt"|"ko"|"special"|"aoe"|"charge"|"rage"|"death";
export type AssetDefinition={id:string;source:string;pivot:[number,number];scale:number;animations:Partial<Record<AnimationName,{frames:string[];fps:number;loop:boolean}>>;licenseRef:string;fallback?:string};
export const ASSETS:Record<string,AssetDefinition>={
 guardian:{id:"guardian",source:"/assets/bosses/guardian.svg",pivot:[.5,1],scale:1,animations:{idle:{frames:["guardian"],fps:1,loop:true}},licenseRef:"project-original-placeholder"}
};

// Active character/boss sheets and semantic clips (High 8).
export {SPRITES,CHARACTER_STATES,BOSS_STATES,clipFor} from '../animation/manifest';
