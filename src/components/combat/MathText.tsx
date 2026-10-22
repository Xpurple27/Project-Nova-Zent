"use client";
import {useEffect,useRef} from "react";

declare global {
 interface Window { katex?: { render:(source:string,element:HTMLElement,options:{throwOnError:boolean;displayMode:boolean;strict:string})=>void } }
}
function splitMath(source:string){
 const parts:{math:boolean;text:string}[]=[];let cursor=0;
 const pattern=/\$(.+?)\$/gs;let match:RegExpExecArray|null;
 while((match=pattern.exec(source))){
  if(match.index>cursor)parts.push({math:false,text:source.slice(cursor,match.index)});
  parts.push({math:true,text:match[1]});cursor=match.index+match[0].length;
 }
 if(cursor<source.length)parts.push({math:false,text:source.slice(cursor)});
 return parts;
}
export default function MathText({children,className}:{children:string;className?:string}){
 const root=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const render=()=>{
   if(!root.current||!window.katex)return false;
   root.current.replaceChildren();
   for(const part of splitMath(children)){
    if(!part.math){root.current.append(document.createTextNode(part.text));continue;}
    const span=document.createElement("span");
    window.katex.render(part.text,span,{throwOnError:false,displayMode:false,strict:"warn"});root.current.append(span);
   }
   return true;
  };
  if(render())return;
  const timer=window.setInterval(()=>{if(render())window.clearInterval(timer);},80);
  const stop=window.setTimeout(()=>window.clearInterval(timer),4000);
  return()=>{window.clearInterval(timer);window.clearTimeout(stop);};
 },[children]);
 return <span ref={root} className={className}>{children}</span>;
}
