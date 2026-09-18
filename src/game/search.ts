/* Copyright (c) 2026 Celia. All rights reserved. */
import {apply,moves,other,inCheck,type Piece,type Side,type Move,type Kind} from './rules.ts';
const value:Record<Kind,number>={k:100000,r:900,c:450,n:420,a:200,b:200,p:100};
function evaluate(board:Piece[],side:Side){return board.reduce((sum,p)=>{const advance=p.side==='red'?9-p.y:p.y;const positional=p.kind==='p'?advance*9:p.kind==='n'?(4-Math.abs(p.x-4))*8+Math.min(advance,5)*6:p.kind==='r'||p.kind==='c'?Math.min(advance,6)*3:0;return sum+(p.side===side?1:-1)*(value[p.kind]+positional)},0);}
function ordered(board:Piece[],side:Side){return moves(board,side).sort((a,b)=>{const v=(m:Move)=>{const target=board.find(p=>p.x===m.x&&p.y===m.y);return target?value[target.kind]*10-value[board.find(p=>p.id===m.id)!.kind]:0};return v(b)-v(a)});}
// Iterative deepening preserves the best fully completed search on a time limit.
export function search(board:Piece[],side:Side,budget=1800,maxDepth=3){const deadline=Date.now()+budget;const root=ordered(board,side);let best=root[0] as Move|undefined,completed=0;
 const immediate=root.find(m=>!moves(apply(board,m),other(side)).length);if(immediate)return {move:immediate,depth:1};
 function exchanges(b:Piece[],s:Side,left:number,alpha:number,beta:number):number{
  if(Date.now()>deadline)throw new Error('deadline');
  const staticScore=evaluate(b,s);if(left===0)return staticScore;
  const checked=inCheck(b,s),options=ordered(b,s);if(!options.length)return -1000000;
  if(!checked){if(staticScore>=beta)return staticScore;alpha=Math.max(alpha,staticScore);}
  let best=checked?-Infinity:staticScore;
  for(const m of options){if(!checked&&!b.some(p=>p.x===m.x&&p.y===m.y))continue;const score=-exchanges(apply(b,m),other(s),left-1,-beta,-alpha);best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break;}
  return best;
 }
 function negamax(b:Piece[],s:Side,depth:number,alpha:number,beta:number,ply:number):number{
  if(Date.now()>deadline)throw new Error('deadline');
  if(!b.some(p=>p.kind==='k'&&p.side===s))return -1000000+ply;
  if(depth===0)return exchanges(b,s,2,alpha,beta);
  const options=ordered(b,s);if(!options.length)return -1000000+ply;
  let best=-Infinity;for(const m of options){const score=-negamax(apply(b,m),other(s),depth-1,-beta,-alpha,ply+1);best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break;}return best;
 }
 for(let depth=1;depth<=maxDepth;depth++){try{let score=-Infinity,candidate=best;for(const m of root){const n=apply(board,m);const v=-negamax(n,other(side),depth-1,-Infinity,-score,1);if(v>score){score=v;candidate=m;}}best=candidate;completed=depth;if(best)root.sort((a,b)=>a===best?-1:b===best?1:0);}catch{break;}}
 return {move:best,depth:completed};
}
