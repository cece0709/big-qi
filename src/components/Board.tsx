/* Copyright (c) 2026 Celia. All rights reserved. */
import {useId,useLayoutEffect,useRef,useState} from 'react';
import {names,reason,basic,type Piece} from '../game/rules';
import {chessSound,unlockSound} from '../game/sound';
const position=(x:number,y:number)=>({left:`${(32+x*52)/4.8}%`,top:`${(32+y*51.7)/5.3}%`});
export default function Board({board,selected,onCell,last,compact=false,freePlacement=false,research=false,recommendation}:{board:Piece[];selected?:string|null;onCell?:(x:number,y:number)=>void;last?:{x:number;y:number};compact?:boolean;freePlacement?:boolean;research?:boolean;recommendation?:{id:string;x:number;y:number}}){
 const root=useRef<HTMLDivElement>(null),nodes=useRef(new Map<string,HTMLButtonElement>()),previous=useRef(board),previousSelection=useRef(selected);
 const [moving,setMoving]=useState(false),[ghosts,setGhosts]=useState<Piece[]>([]);
 const marker=useId().replace(/:/g,'');const recommended=board.find(p=>p.id===recommendation?.id);
 const p=board.find(q=>q.id===selected),moveReason=research?basic:reason;
 useLayoutEffect(()=>{if(selected&&selected!==previousSelection.current&&onCell)chessSound('lift');previousSelection.current=selected;},[selected,onCell]);
 useLayoutEffect(()=>{
  const old=previous.current;previous.current=board;
  const changed=board.filter(p=>{const before=old.find(q=>q.id===p.id);return before&&(p.x!==before.x||p.y!==before.y)});
  if(!changed.length)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?0:380;
  const captured=changed.length===1?old.filter(p=>!board.some(q=>q.id===p.id)):[];
  setGhosts(captured);setMoving(true);const animations:Animation[]=[];
  for(const piece of changed){const before=old.find(q=>q.id===piece.id)!,el=nodes.current.get(piece.id);if(!el)continue;
   const dx=(before.x-piece.x)*52/480*root.current!.clientWidth,dy=(before.y-piece.y)*51.7/530*root.current!.clientHeight;
   if(!reduced){animations.push(el.animate([{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`,zIndex:12},{transform:'translate(-50%,-50%)',zIndex:12}],{duration,easing:'cubic-bezier(.22,.65,.25,1)'}));
    animations.push(el.querySelector('.piece-face')!.animate([{transform:'translateY(-9px) scale(1.09)'},{transform:'translateY(-13px) scale(1.1)',offset:.45},{transform:'translateY(1px) scale(.98)',offset:.86},{transform:'translateY(0) scale(1)'}],{duration:duration+100,easing:'ease-in-out'}));}
  }
  const soundTimer=window.setTimeout(()=>{if(changed.length===1&&onCell)chessSound(captured.length?'capture':'place');},duration*.86);
  const timer=window.setTimeout(()=>{setMoving(false);setGhosts([]);},duration+100);
  return()=>{clearTimeout(timer);clearTimeout(soundTimer);animations.forEach(a=>a.cancel());setMoving(false);setGhosts([]);};
 },[board]);
 function click(x:number,y:number){if(moving)return;unlockSound();onCell?.(x,y);}
 return <div ref={root} className={'board tactile-board '+(compact?'compact':'')} aria-busy={moving}>
 <svg viewBox="0 0 480 530" className="board-lines" aria-hidden="true"><rect x="27" y="27" width="426" height="476" fill="none" strokeWidth="2"/>{Array.from({length:10},(_,y)=><line key={'h'+y} x1="32" x2="448" y1={32+y*51.7} y2={32+y*51.7}/>)}{Array.from({length:9},(_,x)=><g key={x}><line x1={32+x*52} x2={32+x*52} y1="32" y2={x===0||x===8?497:239}/>{x>0&&x<8&&<line x1={32+x*52} x2={32+x*52} y1="290.5" y2="497"/>}</g>)}<path d="M188 32L292 135.4M292 32L188 135.4M188 393.9L292 497M292 393.9L188 497"/><text x="137" y="275" textAnchor="middle">楚 河</text><text x="343" y="275" textAnchor="middle">汉 界</text></svg>{recommendation&&recommended&&<svg className="recommendation-arrow" viewBox="0 0 480 530" aria-label="AI 推荐走法"><defs><marker id={marker} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#b88928"/></marker></defs><line x1={32+recommended.x*52} y1={32+recommended.y*51.7} x2={32+recommendation.x*52} y2={32+recommendation.y*51.7} stroke="#b88928" strokeWidth="5" strokeLinecap="round" opacity=".82" markerEnd={'url(#'+marker+')'}/><circle cx={32+recommendation.x*52} cy={32+recommendation.y*51.7} r="22" fill="none" stroke="#b88928" strokeWidth="2" strokeDasharray="5 4"/></svg>}
 {Array.from({length:90},(_,i)=>{const x=i%9,y=Math.floor(i/9);if(board.some(q=>q.x===x&&q.y===y))return null;const legal=p&&(freePlacement||!moveReason(board,p,x,y));return <button key={'cell'+i} className="cell empty-cell" style={position(x,y)} onClick={()=>click(x,y)} aria-label={`${x+1}路${y+1}行${legal?'，可落子':'，空位'}`} tabIndex={onCell?0:-1}>{legal&&<i className="legal-dot"/>}</button>})}
 {ghosts.map(piece=><div key={'ghost'+piece.id} className={'cell tactile-piece captured '+piece.side} style={position(piece.x,piece.y)} aria-hidden="true"><span className="piece-face"><span>{names[piece.side][piece.kind]}</span></span></div>)}
 {board.map(piece=>{const legal=!freePlacement&&p&&!moveReason(board,p,piece.x,piece.y);return <button key={piece.id} ref={el=>{if(el)nodes.current.set(piece.id,el);else nodes.current.delete(piece.id)}} className={'cell tactile-piece '+piece.side+(legal?' capturable':'')+(piece.id===selected?' selected':'')+(last?.x===piece.x&&last.y===piece.y?' last':'')} style={position(piece.x,piece.y)} onClick={()=>click(piece.x,piece.y)} aria-pressed={piece.id===selected} aria-label={`${piece.x+1}路${piece.y+1}行${names[piece.side][piece.kind]}`} tabIndex={onCell?0:-1}><span className="piece-face"><span>{names[piece.side][piece.kind]}</span></span></button>})}
 </div>
}
