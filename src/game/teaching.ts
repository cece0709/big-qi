/* Copyright (c) 2026 Celia. All rights reserved. */
import {search} from './search.ts';
import {apply,inCheck,lessons,moves,names,other,suggest,type Piece,type Side,type Move,type Kind} from './rules.ts';
export function validatePosition(board:Piece[],turn:Side):string|null{
 const occupied=new Set<string>(),ids=new Set<string>();
 for(const p of board){if(ids.has(p.id)||occupied.has(`${p.x},${p.y}`))return '有棋子重叠，请先调整。';ids.add(p.id);occupied.add(`${p.x},${p.y}`);if(p.x<0||p.x>8||p.y<0||p.y>9)return '棋子必须在棋盘内。';}
 const limits:Record<Kind,number>={k:1,a:2,b:2,n:2,r:2,c:2,p:5};
 for(const side of ['red','black'] as Side[]){const army=board.filter(p=>p.side===side),label=side==='red'?'红方':'黑方';if(army.filter(p=>p.kind==='k').length!==1)return `${label}必须保留一位帅（将）。`;
  for(const kind of Object.keys(limits) as Kind[])if(army.filter(p=>p.kind===kind).length>limits[kind])return `${label}${names[side][kind]}的数量超出标准配置。`;
  for(const p of army){const y=side==='red'?9-p.y:p.y;
   if(p.kind==='k'&&(p.x<3||p.x>5||y>2))return `${label}的帅（将）需要放在九宫内。`;
   if(p.kind==='a'&&![[3,0],[5,0],[4,1],[3,2],[5,2]].some(([x,r])=>x===p.x&&r===y))return `${label}的仕（士）需要放在九宫的五个斜线交点上。`;
   if(p.kind==='b'&&![[2,0],[6,0],[0,2],[4,2],[8,2],[2,4],[6,4]].some(([x,r])=>x===p.x&&r===y))return `${label}的相（象）需要放在本方半场的合法象位。`;
   if(p.kind==='p'&&(y<3||(y<5&&p.x%2!==0)))return `${label}的兵卒不能放在起始线后面，过河前只能在原来的五条兵线上。`;
  }
 }
 const kings=board.filter(p=>p.kind==='k');if(kings[0].x===kings[1].x&&!board.some(p=>p.x===kings[0].x&&p.y>Math.min(kings[0].y,kings[1].y)&&p.y<Math.max(kings[0].y,kings[1].y)))return '两位将帅不能直接照面，请在中间放子或调整位置。';
 if(inCheck(board,other(turn)))return '未轮到走的一方已被将军，请更改“先行方”或调整局面。';
 return null;
}
export type Advice={depth?:number;move?:Move;title:string;why:string;use:string;idiom:string;idiomMeaning:string;risk:string};
export function analyze(board:Piece[],side:Side):Advice{
 const {move,depth}=search(board,side);
 if(!move)return {title:'本方已无合法走法',why:inCheck(board,side)?'帅（将）受到攻击，所有解救方式都无效。':'本方没有可以合法移动的棋子。',use:'本局结束，可以解锁棋局后继续研究。',idiom:'',idiomMeaning:'',risk:''};
 const p=board.find(p=>p.id===move.id)!,target=board.find(p=>p.x===move.x&&p.y===move.y),next=apply(board,move),replies=moves(next,other(side));
 const check=inCheck(next,other(side)),escape=inCheck(board,side),retake=replies.some(r=>r.x===move.x&&r.y===move.y);
 let why=lessons[p.kind].rule,use=lessons[p.kind].tip,idiom='稳扎稳打',idiomMeaning='先让棋子站稳，再逐步改善局面。';
 if(!replies.length){why=check?'这一步将军，并封住了对方所有合法解救方式。':'这一步后，对方已没有合法棋可走。';use='按照象棋规则，本方获胜。';idiom='一锤定音';idiomMeaning='关键一步让这局棋有了结果。';}
 else if(escape){why='本方正在被将军，这一步能解除对帅（将）的威胁。';use='先让帅安全，才能继续谋划进攻。';idiom='转危为安';idiomMeaning='先化解眼前的危险。';}
 else if(target){why=`这一步可以吃掉对方的${names[target.side][target.kind]}。`;use=retake?'对方可以立即回吃这枚棋子，属于可能的交换，要结合后续变化判断。':'对方下一步无法在此位置直接回吃这枚棋子，有利于争取子力优势。';idiom=retake?'权衡利弊':'积少成多';idiomMeaning=retake?'既看得到什么，也看可能失去什么。':'逐步积累子力与局面上的优势。';}
 else if(check){why='这一步会攻击对方的帅（将），形成将军。';use=`对方必须先应将，目前有 ${replies.length} 种合法应对；将军不等于已经赢棋。`;idiom='先发制人';idiomMeaning='主动制造威胁，让对手先处理你的进攻。';}
 else if(p.kind==='n'||p.kind==='r'||p.kind==='c'){why=`调动${names[p.side][p.kind]}，在当前有限深度搜索中，这步的子力结果与位置评分最优或并列最优。`;use='把大子投入对弈；同时观察对方的应手，不要只盯着进攻。';}
 return {move,depth,title:`${names[p.side][p.kind]}：${p.x+1}路${p.y+1}行 → ${move.x+1}路${move.y+1}行`,why,use,idiom,idiomMeaning,risk:retake?'注意：落点受到对方攻击，存在立即回吃。':'有限深度搜索不能保证更深层变化最优，请继续观察对方应手。'};
}
