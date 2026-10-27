"use client";
import {useMemo} from 'react';
import {renderToString} from 'katex';
import {splitMathText} from '@/game/questions/math-markup';

/** Renders presentation only. Grading and the original option token remain server-owned. */
export default function MathText({children,className}:{children:string;className?:string}){
 const parts=useMemo(()=>splitMathText(children).map(part=>{
  if(part.kind==='text')return part;
  try{
   if(part.source.length>1200)throw Error('FORMULA_TOO_LONG');
   const html=renderToString(part.source,{displayMode:part.display,output:'htmlAndMathml',throwOnError:true,strict:'error',trust:false,maxExpand:100,maxSize:10});
   return {...part,html};
  }catch{return {kind:'text' as const,source:part.source};}
 }),[children]);
 return <span className={className}>{parts.map((part,index)=>part.kind==='text'
  ?<span key={index}>{part.source}</span>
  :<span key={index} className={part.display?'math-rendered math-display':'math-rendered'} dangerouslySetInnerHTML={{__html:part.html}}/>)}</span>;
}
