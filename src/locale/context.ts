import {useEffect,useSyncExternalStore,createElement,type ReactNode} from 'react';
export type Language='zh'|'en'|'es'|'ja'|'ko';
export const languageNames={zh:'简体中文',en:'English',es:'Español',ja:'日本語',ko:'한국어'};
declare global{interface Window{yijianLanguage?:Language;}}
// A browser-wide store keeps the app and JSX runtime in sync, even when the
// development bundler creates separate module instances. React still owns all text.
function snapshot():Language{if(typeof window==='undefined')return 'zh';if(window.yijianLanguage)return window.yijianLanguage;try{const value=localStorage.getItem('yijian-language') as Language;window.yijianLanguage=value in languageNames?value:'zh';}catch{window.yijianLanguage='zh';}return window.yijianLanguage;}
function subscribe(listener:()=>void){window.addEventListener('yijian-language',listener);return()=>window.removeEventListener('yijian-language',listener);}
function setLanguage(language:Language){window.yijianLanguage=language;try{localStorage.setItem('yijian-language',language);}catch{}window.dispatchEvent(new Event('yijian-language'));}
export function useLanguage(){return {language:useSyncExternalStore(subscribe,snapshot,()=> 'zh' as Language),setLanguage};}
export function LanguageProvider({children}:{children:ReactNode}){const {language}=useLanguage();useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':language;},[language]);return children;}
export function LanguageSelector(){const {language,setLanguage}=useLanguage();return createElement('div',{className:'locale-control'},createElement('select',{'aria-label':'Language / 语言',value:language,onChange:(e:{target:{value:string}})=>setLanguage(e.target.value as Language)},Object.entries(languageNames).map(([value,name])=>createElement('option',{value,key:value},name))));}
