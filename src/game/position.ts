/* Copyright (c) 2026 Celia. All rights reserved. */
import {inCheck,moves,names,other,type Kind,type Piece,type Side} from './rules.ts';
export function positionIssues(board:Piece[],turn:Side):string[]{
 const issues:string[]=[],cells=new Set<string>(),ids=new Set<string>();
 for(const p of board){
  if(ids.has(p.id))issues.push('棋子标识重复，需重新摆放。');
  if(cells.has(`${p.x},${p.y}`))issues.push('两枚棋子占用了同一个位置。');
  if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>8||p.y<0||p.y>9)issues.push('棋子必须位于棋盘交点上。');
  ids.add(p.id);cells.add(`${p.x},${p.y}`);
 }
 const limits:Record<Kind,number>={k:1,a:2,b:2,n:2,r:2,c:2,p:5};
 for(const side of ['red','black'] as Side[]){
  const army=board.filter(p=>p.side===side),label=side==='red'?'红方':'黑方';
  if(army.filter(p=>p.kind==='k').length!==1)issues.push(`${label}必须保留且只能有一位帅（将）。`);
  for(const kind of Object.keys(limits) as Kind[])if(army.filter(p=>p.kind===kind).length>limits[kind])issues.push(`${label}${names[side][kind]}的数量超过标准配置。`);
  const pawnFiles=new Set<number>();
  for(const p of army){const y=side==='red'?9-p.y:p.y;
   if(p.kind==='k'&&(p.x<3||p.x>5||y<0||y>2))issues.push(`${label}帅（将）应在九宫内。`);
   if(p.kind==='a'&&![[3,0],[5,0],[4,1],[3,2],[5,2]].some(([x,r])=>x===p.x&&r===y))issues.push(`${label}仕（士）应在九宫的五个斜线交点上。`);
   if(p.kind==='b'&&![[2,0],[6,0],[0,2],[4,2],[8,2],[2,4],[6,4]].some(([x,r])=>x===p.x&&r===y))issues.push(`${label}相（象）应在本方半场的合法象位上。`);
   if(p.kind==='p'){
    if(y<3||(y<5&&p.x%2!==0))issues.push(`${label}兵卒不能退到起始线后；过河前应在原来的兵线上。`);
    if(y<5&&pawnFiles.has(p.x))issues.push(`${label}同一条兵线上不能有两枚未过河兵卒。`);
    if(y<5)pawnFiles.add(p.x);
   }
  }
 }
 const kings=board.filter(p=>p.kind==='k');
 if(kings.length===2&&kings[0].x===kings[1].x&&!board.some(p=>p.x===kings[0].x&&p.y>Math.min(kings[0].y,kings[1].y)&&p.y<Math.max(kings[0].y,kings[1].y)))issues.push('将帅直接照面，中间需要有棋子阻隔。');
 if(kings.length===2){
  if(inCheck(board,'red')&&inCheck(board,'black'))issues.push('双方同时被将军，不能作为正常对弈的起点。');
  else if(inCheck(board,other(turn)))issues.push('未轮到行棋的一方已被将军，请调整“谁先走”或棋子位置。');
  if(!issues.length&&!moves(board,turn).length)issues.push('先行方已无合法走法，这个局面已经结束。');
 }
 return [...new Set(issues)];
}
