/** Compatibility entrypoint: all cutscene definitions use the typed story contract. */
export type {StoryDefinition as CutsceneDefinition,StoryCommand as CutsceneCommand,StoryId} from '../story/definitions';
export type {StoryState,StoryFrame} from '../story/runtime';
