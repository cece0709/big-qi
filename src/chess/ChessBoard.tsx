/* Copyright (c) 2026 Celia. All rights reserved. */
import {useLayoutEffect,useRef,useState} from 'react';
import {glyphs,pieceNames,readBoard,squareAt,xy,type InputMove,type Square} from './engine';
import {chessSound,unlockSound} from '../game/sound';
export default function ChessBoard({fen,selected,legal=[],last,recommendation,onSquare,flipped=false}:{fen:string;selected?:Square|null;legal?:Square[];last?:InputMove;recommendation?:InputMove;onSquare?:(s:Square)=>void;flipped?:boolean}){
 const board=readBoard(fen),root=useRef<HTMLDivElement>(null),previous=useRef(fen),[moving,setMoving]=useState(false);
 const squares=Array.from({length:64},(_,i)=>squareAt(flipped?7-i%8:i%8,flipped?7-Math.floor(i/8):Math.floor(i/8)));
 useLayoutEffect(()=>{
  const old=previous.current;previous.current=fen;if(old===fen||!last)return;
  const oldBoard=readBoard(old),p=oldBoard.find(p=>p.square===last.from),now=board.find(p=>p.square===last.to);if(!p||!now||p.color!==now.color)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,animations:Animation[]=[];
  function slide(from:Square,to:Square){const el=root.current?.querySelector(`[data-square="${to}"] .international-piece`);if(!el||reduced)return;const [x,y]=xy(from),[a,b]=xy(to),sign=flipped?-1:1;animations.push(el.animate([{transform:`translate(${(x-a)*100*sign}%,${(y-b)*100*sign}%) scale(1.08)`},{transform:'translate(0,0) scale(1)'}],{duration:340,easing:'cubic-bezier(.2,.65,.2,1)'}));}
  slide(last.from,last.to);if(p.type==='k'&&Math.abs(xy(last.from)[0]-xy(last.to)[0])===2){const rank=last.from[1];slide((last.to[0]==='g'?'h':'a')+rank as Square,(last.to[0]==='g'?'f':'d')+rank as Square);}
  setMoving(true);const timer=setTimeout(()=>{setMoving(false);if(onSquare)chessSound(oldBoard.some(p=>p.square===last.to)?'capture':'place');},reduced?0:340);
  return()=>{clearTimeout(timer);animations.forEach(a=>a.cancel());setMoving(false);};
 },[fen]);
 return <div ref={root} className="international-board" aria-label="国际象棋棋盘" aria-busy={moving}>{squares.map((square,index)=>{
  const p=board.find(p=>p.square===square),[x,y]=xy(square),can=legal.includes(square),chosen=selected===square;
  return <button type="button" key={square} data-square={square} aria-label={`${square}${p?' '+(p.color==='w'?'白':'黑')+pieceNames[p.type]:' 空格'}${can?'，可落子':''}`} aria-pressed={chosen} tabIndex={onSquare?0:-1} className={'chess-square '+((x+y)%2?'dark-square':'light-square')+(chosen?' chosen':'')+(can?' available':'')+(last?.from===square||last?.to===square?' last-square':'')+(recommendation?.to===square?' recommended-square':'')} onClick={()=>{if(moving||!onSquare)return;unlockSound();if(p)chessSound('lift');onSquare(square);}}>
   {index%8===0&&<span className="rank-label" aria-hidden="true">{square[1]}</span>}{index>=56&&<span className="file-label" aria-hidden="true">{square[0]}</span>}
   {p&&<span aria-hidden="true" className={'international-piece '+(p.color==='w'?'ivory-piece':'ebony-piece')}>{glyphs[p.type]}</span>}{can&&!p&&<i className="chess-dot"/>}
  </button>;
 })}</div>;
}
