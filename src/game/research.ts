/* Copyright (c) 2026 Celia. All rights reserved. */
import {basic,names,type Piece,type Side,type Move,type Kind} from './rules.ts';
import type {Advice} from './teaching.ts';
export function researchMoves(board:Piece[],side:Side):Move[]{return board.filter(p=>p.side===side).flatMap(p=>Array.from({length:90},(_,i)=>({id:p.id,x:i%9,y:Math.floor(i/9)})).filter(m=>!basic(board,p,m.x,m.y)));}
export function analyzeResearch(board:Piece[],side:Side):Advice{
 const values:Record<Kind,number>={k:0,r:9,n:4,c:4,a:2,b:2,p:1};
 const options=researchMoves(board,side);options.sort((a,b)=>{const score=(m:Move)=>{const t=board.find(p=>p.x===m.x&&p.y===m.y);return (t?values[t.kind]*10:0)+4-Math.abs(4-m.x);};return score(b)-score(a);});
 const move=options[0],piece=board.find(p=>p.id===move?.id);
 return {move,title:move&&piece?`${names[side][piece.kind]}：${piece.x+1}路${piece.y+1}行 → ${move.x+1}路${move.y+1}行`:'本方没有可演示的走法',why:'当前局面不符合正常对弈要求，仅按棋子基本走法比较吃子和靠近中路的选择。',use:move?'用于观察棋子的移动，不表示正常对弈中的最佳解。':'可以解锁、补回棋子或恢复标准开局。',idiom:'',idiomMeaning:'',risk:'研究模式不校验将帅安全，不判断将杀和胜负。要开始正常对弈，请解锁修正局面后重新锁定。'};
}
