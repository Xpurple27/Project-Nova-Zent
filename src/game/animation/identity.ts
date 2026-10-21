import type {CharacterClass} from '../core/types';
/** Presentation metadata only. Class IDs, player names, skills and stats remain unchanged. */
export const HERO_IDENTITY:Record<CharacterClass,{title:string;role:string;style:string;portrait:string;art:string}>={
 WARRIOR:{title:'Pelindung Segel Retak',role:'Tank · Protection',style:'Perisai retak, baja biru, perlindungan garis depan.',portrait:'/assets/identity/warrior-portrait.webp',art:'/assets/identity/warrior.webp'},
 MAGE:{title:'Perangkai Formula',role:'Burst · Arcane',style:'Astrolabe violet, geometri melayang, ledakan arcane.',portrait:'/assets/identity/mage-portrait.webp',art:'/assets/identity/mage.webp'},
 THIEF:{title:'Pengintai Bayangan',role:'Speed · Debuff',style:'Bilah kait kembar, langkah tajam, celah pertahanan.',portrait:'/assets/identity/thief-portrait.webp',art:'/assets/identity/thief.webp'},
 HEALER:{title:'Penjaga Harmoni',role:'Heal · Recovery',style:'Cincin restorasi emas, mantel gading, sigil penstabil.',portrait:'/assets/identity/healer-portrait.webp',art:'/assets/identity/healer.webp'}
};
export const GUARDIAN_ART='/assets/identity/guardian.webp';
