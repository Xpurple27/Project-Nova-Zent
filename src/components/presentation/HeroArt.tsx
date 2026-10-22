'use client';
import {useState} from 'react';
import type {CharacterClass} from '@/game/core/types';
import {HERO_IDENTITY} from '@/game/animation/identity';
import {PAINTED} from '@/game/animation/painted';
/** One identity shared by selection, dialogue and combat. Failed art keeps a real sprite. */
export default function HeroArt({kind,portrait=false,className=''}:{kind:CharacterClass;portrait?:boolean;className?:string}){
 const [failed,setFailed]=useState(false),identity=HERO_IDENTITY[kind],sheet=PAINTED[kind];
 return <span className={`hero-artwork chibi ${portrait?'portrait':''} ${className}`} data-hero={kind}>
  {failed?<span className="hero-sprite-fallback" role="img" aria-label={kind+' character'} style={{backgroundImage:`url(${sheet.source})`,backgroundSize:`${sheet.frame*4}px auto`}}/>:
  <img src={portrait?identity.portrait:identity.art} alt={`${kind} — ${identity.title}`} width={portrait?256:192} height={portrait?256:192} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>}
 </span>;
}
