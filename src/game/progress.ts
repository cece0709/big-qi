import type {Kind} from './rules';
export const PROGRESS_KEY='yijian-progress-v1';
type Result={id:string;day:string;result:'win'|'loss'|'draw';ai:boolean};
type Day={moves:number;pieces:string[];puzzles:string[]};
export type Progress={version:1;pieces:Kind[];puzzles:Record<string,number>;games:Result[];days:Record<string,Day>;badges:string[]};
const empty=():Progress=>({version:1,pieces:[],puzzles:{},games:[],days:{},badges:[]});
export const dayKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export function decodeProgress(raw:string|null):Progress{try{const v=JSON.parse(raw||'null');if(v?.version!==1)return empty();const p=empty();p.pieces=[...new Set<Kind>((Array.isArray(v.pieces)?v.pieces:[]).filter((x:Kind)=>['r','n','b','a','k','c','p'].includes(x)))];for(const [id,star] of Object.entries(v.puzzles||{}))if(typeof star==='number'&&Number.isInteger(star)&&star>=1&&star<=3)p.puzzles[id]=star;p.games=(Array.isArray(v.games)?v.games:[]).filter((g:Result,i:number,a:Result[])=>typeof g?.id==='string'&&['win','loss','draw'].includes(g.result)&&typeof g.ai==='boolean'&&/^\d{4}-\d{2}-\d{2}$/.test(g.day)&&a.findIndex(x=>x.id===g.id)===i);for(const [key,value] of Object.entries(v.days||{})){const d=value as Day;if(/^\d{4}-\d{2}-\d{2}$/.test(key)&&d&&Number.isFinite(d.moves)&&d.moves>=0)p.days[key]={moves:Math.floor(d.moves),pieces:Array.isArray(d.pieces)?d.pieces.filter(x=>typeof x==='string'):[],puzzles:Array.isArray(d.puzzles)?d.puzzles.filter(x=>typeof x==='string'):[]};}p.badges=Array.isArray(v.badges)?v.badges.filter((x:unknown)=>typeof x==='string'):[];return p;}catch{return empty();}}
export function statistics(p:Progress,today=new Date()){let best=0,streak=0;for(const g of p.games){if(!g.ai)continue;streak=g.result==='win'?streak+1:0;best=Math.max(best,streak);}const cursor=new Date(today.getFullYear(),today.getMonth(),today.getDate(),12);if(!p.days[dayKey(cursor)])cursor.setDate(cursor.getDate()-1);let days=0;while(p.days[dayKey(cursor)]){days++;cursor.setDate(cursor.getDate()-1);}return {games:p.games.length,wins:p.games.filter(g=>g.ai&&g.result==='win').length,best,streak,days,solved:Object.keys(p.puzzles).length,stars:Object.values(p.puzzles).reduce((a,b)=>a+b,0)};}
export const badges=[
 {id:'first-piece',name:'初识一子',description:'认识第一种棋子',test:(p:Progress)=>p.pieces.length>=1},
 {id:'all-pieces',name:'七子相识',description:'认识全部七种棋子',test:(p:Progress)=>p.pieces.length===7},
 {id:'first-puzzle',name:'初解棋题',description:'通过第一个残局',test:(p:Progress)=>statistics(p).solved>=1},
 {id:'five-puzzles',name:'小有所成',description:'通过五个残局',test:(p:Progress)=>statistics(p).solved>=5},
 {id:'ten-puzzles',name:'棋路渐宽',description:'通过十个残局',test:(p:Progress)=>statistics(p).solved>=10},
 {id:'three-stars',name:'独立思考',description:'获得一个三星评价',test:(p:Progress)=>Object.values(p.puzzles).includes(3)},
 {id:'first-game',name:'一局初成',description:'完整下完一局',test:(p:Progress)=>p.games.length>=1},
 {id:'first-win',name:'初见胜意',description:'首次战胜陪练',test:(p:Progress)=>statistics(p).wins>=1},
 {id:'three-wins',name:'三局从容',description:'陪练对局连续获胜三次',test:(p:Progress)=>statistics(p).best>=3},
 {id:'seven-days',name:'七日相伴',description:'连续学习七天',test:(p:Progress)=>statistics(p).days>=7}
];
let cached:Progress|undefined;export let storageAvailable=true;
const listeners=new Set<()=>void>();
export function readProgress(){if(!cached){try{cached=decodeProgress(localStorage.getItem(PROGRESS_KEY));}catch{storageAvailable=false;cached=empty();}}return cached;}
export function subscribeProgress(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key===PROGRESS_KEY){cached=decodeProgress(e.newValue);listeners.forEach(fn=>fn());}});
function update(change:(p:Progress,d:Day)=>void){const p=structuredClone(readProgress()),key=dayKey();p.days[key]??={moves:0,pieces:[],puzzles:[]};change(p,p.days[key]);const earned=badges.filter(b=>!p.badges.includes(b.id)&&b.test(p));p.badges.push(...earned.map(b=>b.id));cached=p;try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(p));storageAvailable=true;}catch{storageAvailable=false;}listeners.forEach(fn=>fn());if(earned.length)window.dispatchEvent(new CustomEvent('yijian-achievement',{detail:earned.map(b=>b.name)}));}
export const recordMove=()=>update((_p,d)=>{d.moves++;});
export const learnPiece=(kind:Kind)=>update((p,d)=>{if(!p.pieces.includes(kind))p.pieces.push(kind);if(!d.pieces.includes(kind))d.pieces.push(kind);});
export const finishPuzzle=(id:string,stars:number)=>update((p,d)=>{p.puzzles[id]=Math.max(p.puzzles[id]||0,Math.min(3,Math.max(1,stars)));if(!d.puzzles.includes(id))d.puzzles.push(id);});
export const finishGame=(id:string,result:Result['result'],ai:boolean)=>update(p=>{p.games=p.games.filter(g=>g.id!==id);p.games.push({id,day:dayKey(),result,ai});});
export const reopenGame=(id:string)=>{if(readProgress().games.some(g=>g.id===id))update(p=>{p.games=p.games.filter(g=>g.id!==id);});};
