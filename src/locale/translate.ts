import messages from './messages.json';
import type {Language} from './context';
const dictionaries=messages as Record<string,Record<string,string>>;
// Keep the copyright holder's chosen name unchanged in every language.
const copyright:Record<string,string>={en:'© 2026 Celia. All rights reserved.',es:'© 2026 Celia. Todos los derechos reservados.',ja:'© 2026 Celia. 無断転載・複製を禁じます。',ko:'© 2026 Celia. 모든 권리 보유.'};
for(const [language,text] of Object.entries(copyright))dictionaries[language]['© 2026 Celia. 保留所有权利。']=text;
const terminology:Record<string,Record<string,string>>={
 en:{'弈见':'Yijian','中国象棋':'Xiangqi','国际象棋':'Chess','悔棋':'Undo','撤回':'Undo','简单':'Easy','中等':'Medium','困难':'Hard','将军':'Check','将死':'Checkmate','逼和':'Stalemate','红方':'Red','黑方':'Black','白方':'White','再试一次':'Try again','看正确走法':'Show a legal move'},
 es:{'弈见':'Yijian','中国象棋':'Xiangqi','国际象棋':'Ajedrez','悔棋':'Deshacer','撤回':'Deshacer','简单':'Fácil','中等':'Media','困难':'Difícil','将军':'Jaque','将死':'Jaque mate','逼和':'Ahogado','红方':'Rojo','黑方':'Negro','白方':'Blanco','再试一次':'Intentar de nuevo','看正确走法':'Ver una jugada legal'},
 ja:{'弈见':'Yijian','中国象棋':'シャンチー（中国象棋）','国际象棋':'チェス','悔棋':'待った','撤回':'一手戻す','简单':'やさしい','中等':'ふつう','困难':'むずかしい','将军':'チェック','将死':'チェックメイト','逼和':'ステイルメイト','红方':'赤','黑方':'黒','白方':'白','再试一次':'もう一度試す','看正确走法':'合法手を見る'},
 ko:{'弈见':'Yijian','中国象棋':'샹치 (중국 장기)','国际象棋':'체스','悔棋':'무르기','撤回':'한 수 되돌리기','简单':'쉬움','中等':'보통','困难':'어려움','将军':'체크','将死':'체크메이트','逼和':'스테일메이트','红方':'빨강','黑方':'흑','白方':'백','再试一次':'다시 시도','看正确走法':'가능한 수 보기'}
};
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const compiled=new Map<string,{dict:Record<string,string>;fragments:RegExp;patterns:{source:RegExp;value:string}[]}>();
function dictionary(language:Language){let entry=compiled.get(language);if(entry)return entry;const dict={...dictionaries[language],...terminology[language]},keys=Object.keys(dict);entry={dict,fragments:new RegExp(keys.filter(k=>!k.includes('{')).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g'),patterns:keys.filter(k=>/\{\d+\}/.test(k)).sort((a,b)=>b.length-a.length).map(k=>({source:new RegExp('^'+k.split(/\{\d+\}/).map(escape).join('([\\s\\S]*?)')+'$'),value:dict[k]}))};compiled.set(language,entry);return entry;}
export function translate(text:string,language:Language,depth=0):string{if(language==='zh'||!/[\u3400-\u9fff]/.test(text))return text;const normalized=text.replace(/\s+/g,' ').trim(),entry=dictionary(language);if(entry.dict[normalized])return text.replace(text.trim(),entry.dict[normalized]);if(depth<2)for(const p of entry.patterns){const m=normalized.match(p.source);if(m)return p.value.replace(/\{(\d+)\}/g,(_s,i)=>translate(m[Number(i)+1]||'',language,depth+1));}return text.replace(entry.fragments,key=>entry.dict[key]);}
