import {createElement,createContext,useContext,type ReactNode} from 'react';
import {useLanguage} from './context';
import {translate} from './translate';
const Disabled=createContext(false);
// Translate React-owned text rather than modifying live DOM nodes, preserving board events and state.
export function LocalizedElement({tag,...props}:{tag:string;[key:string]:unknown}){
 const {language}=useLanguage(),disabled=useContext(Disabled)||props.translate==='no'||String(props.className||'').includes('piece-face');
 const children=props.children as ReactNode,local=(value:ReactNode):ReactNode=>typeof value==='string'?translate(value,language):Array.isArray(value)?value.map(local):value;
 const next={...props};if(tag==='option'&&props.value===undefined&&typeof children==='string')next.value=children;if(!disabled){next.children=local(children);for(const key of ['title','placeholder','aria-label','alt'])if(typeof next[key]==='string')next[key]=translate(next[key] as string,language);}
 const element=createElement(tag,next);return disabled?createElement(Disabled.Provider,{value:true},element):element;
}
