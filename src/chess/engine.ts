/* Copyright (c) 2026 Celia. All rights reserved. */
import {Chess,DEFAULT_POSITION,validateFen,type Color,type Move,type PieceSymbol,type Square} from 'chess.js';
export {Chess,DEFAULT_POSITION};
export type {Color,Move,PieceSymbol,Square};
export type InputMove={from:Square;to:Square;promotion?:PieceSymbol};
export type GameState={start:string;line:InputMove[]};
export type Token={square:Square;color:Color;type:PieceSymbol};
export const pieceNames:Record<PieceSymbol,string>={k:'王',q:'后',r:'车',b:'象',n:'马',p:'兵'};
export const glyphs:Record<PieceSymbol,string>={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
export const sideName=(c:Color)=>c==='w'?'白方':'黑方';
export const opposite=(c:Color):Color=>c==='w'?'b':'w';
export const xy=(s:Square)=>[s.charCodeAt(0)-97,8-Number(s[1])];
export const squareAt=(x:number,y:number)=>(String.fromCharCode(97+x)+(8-y)) as Square;
export function readBoard(fen:string):Token[]{const pieces:Token[]=[];fen.split(' ')[0].split('/').forEach((rank,y)=>{let x=0;for(const c of rank){if(/\d/.test(c))x+=Number(c);else{pieces.push({square:squareAt(x,y),color:c===c.toUpperCase()?'w':'b',type:c.toLowerCase() as PieceSymbol});x++;}}});return pieces;}
export function setupFen(pieces:Token[],turn:Color){return Array.from({length:8},(_,y)=>{let row='',empty=0;for(let x=0;x<8;x++){const p=pieces.find(p=>p.square===squareAt(x,y));if(!p){empty++;continue;}if(empty){row+=empty;empty=0;}row+=p.color==='w'?p.type.toUpperCase():p.type;}return row+(empty||'');}).join('/')+` ${turn} - - 0 1`;}
export function replay(state:GameState){const game=new Chess(state.start);for(const m of state.line)game.move(m);return game;}
export function label(m:Move){return `${sideName(m.color)}${pieceNames[m.piece]} ${m.from} → ${m.to}${m.promotion?'，升变为'+pieceNames[m.promotion]:''}${m.isKingsideCastle()||m.isQueensideCastle()?'，王车易位':m.isEnPassant()?'，吃过路兵':m.captured?'，吃'+pieceNames[m.captured]:''}`;}
export function outcome(g:Chess){if(g.isCheckmate())return `${sideName(opposite(g.turn()))}获胜，完成将死。`;if(g.isStalemate())return '逼和：行棋方未被将军，却没有合法走法。';if(g.isInsufficientMaterial())return '和棋：双方剩余子力不足以完成将死。';if(g.isThreefoldRepetition())return '和棋：本练习按同一局面三次出现自动判和。';if(g.isDrawByFiftyMoves())return '和棋：本练习按五十回合未动兵、未吃子自动判和。';return '';}
export function explainMove(m:Move){if(m.san.endsWith('#'))return '这一步将军并封住所有合法解救方法，完成将死。';if(m.isKingsideCastle()||m.isQueensideCastle())return '王和车同时调动：王移到侧翼，车进入中央。只有王和这辆车都没动过，路上为空，王的起点、经过和落点都安全时才能易位。';if(m.promotion)return `兵走到底线，升变为${pieceNames[m.promotion]}，立刻按新棋子的走法行动。`;if(m.isEnPassant())return '对方兵刚前进两格，你的兵斜走一步，把经过身旁的兵吃掉。这个机会只在紧接着的一手有效。';if(m.san.endsWith('+'))return '将军！对方下一步必须移动王、吃掉进攻子或挡住攻击，先解除威胁。';if(m.captured)return `这一步吃掉了对方的${pieceNames[m.captured]}，接下来要检查自己的棋子会不会被回吃。`;return '这一步合法。留意棋子之间的保护关系，也别忘了自己王的安全。';}
export function illegalExplanation(g:Chess,from:Square,to:Square){const p=g.get(from);if(!p)return '先选一枚自己的棋子。';if(g.get(to)?.color===p.color)return '这个格子是本方棋子，不能吃自己的棋子。';const guide:Record<PieceSymbol,string>={p:'兵向前直走，斜着吃子；起始位置可走两格，但中间不能有棋子。',n:'马走日字，可以越过棋子。',b:'象沿斜线走，不能越过棋子。',r:'车沿横线或竖线走，不能越过棋子。',q:'后可以沿横、竖、斜线走，不能越过棋子。',k:'王每次走到相邻一格，而且不能进入被攻击的格子。王车易位还有额外条件。'};return (g.isCheck()?'现在正被将军，必须先保护王。':'这一步不在合法落点中。')+guide[p.type]+' 任何走法都不能让自己的王继续受到攻击。';}
export function setupIssues(pieces:Token[],turn:Color){
 const issues:string[]=[];
 for(const color of ['w','b'] as Color[]){const army=pieces.filter(p=>p.color===color),count=(t:PieceSymbol)=>army.filter(p=>p.type===t).length;
  if(count('k')!==1)issues.push(`${sideName(color)}必须且只能有一位王。`);
  if(count('p')>8||army.length>16)issues.push(`${sideName(color)}棋子数量超过标准配置。`);
  if(army.some(p=>p.type==='p'&&/[18]$/.test(p.square)))issues.push(`${sideName(color)}的兵不能停在第一或第八横线，应先完成升变。`);
  const promotions=Math.max(0,count('q')-1)+Math.max(0,count('r')-2)+Math.max(0,count('b')-2)+Math.max(0,count('n')-2);
  if(promotions>8-count('p'))issues.push(`${sideName(color)}额外的大子数量与可升变的兵数不符。`);
 }
 const kings=pieces.filter(p=>p.type==='k');if(kings.length===2){const [x,y]=xy(kings[0].square),[a,b]=xy(kings[1].square);if(Math.max(Math.abs(x-a),Math.abs(y-b))<=1)issues.push('双方的王不能相邻。');}
 if(!issues.length){const fen=setupFen(pieces,turn);if(!validateFen(fen).ok)issues.push('局面格式不符合国际象棋规则。');else{const g=new Chess(fen),idleKing=pieces.find(p=>p.type==='k'&&p.color!==turn)!;if(g.isAttacked(idleKing.square,turn))issues.push('未轮到走的一方已经被将军，请调整行棋方或棋子位置。');else if(g.isGameOver())issues.push('该局面已结束或已满足和棋条件，可换一个局面练习。');}}
 return [...new Set(issues)];
}
export function researchTargets(pieces:Token[],p:Token):Square[]{const [x,y]=xy(p.square);return Array.from({length:64},(_,i)=>squareAt(i%8,Math.floor(i/8))).filter(s=>{const [a,b]=xy(s),dx=a-x,dy=b-y,ax=Math.abs(dx),ay=Math.abs(dy),target=pieces.find(p=>p.square===s);if(s===p.square||target?.color===p.color)return false;if(p.type==='n')return ax*ay===2;if(p.type==='k')return Math.max(ax,ay)===1;if(p.type==='p'){const forward=p.color==='w'?-1:1;if(target)return ax===1&&dy===forward;if(dx)return false;if(dy===forward)return true;return (p.color==='w'?y===6:y===1)&&dy===forward*2&&!pieces.some(p=>p.square===squareAt(x,y+forward));}if(p.type==='b'&&ax!==ay||p.type==='r'&&dx!==0&&dy!==0||p.type==='q'&&dx!==0&&dy!==0&&ax!==ay)return false;const steps=Math.max(ax,ay);for(let step=1;step<steps;step++)if(pieces.some(p=>p.square===squareAt(x+Math.sign(dx)*step,y+Math.sign(dy)*step)))return false;return true;});}
export type Advice={move?:InputMove;title:string;why:string;purpose:string;idiom:string;depth:number};
const values:Record<PieceSymbol,number>={p:100,n:320,b:335,r:500,q:900,k:0};
export function analyze(fen:string,budget=1000):Advice{
 const g=new Chess(fen),deadline=Date.now()+budget,options=g.moves({verbose:true}),side=g.turn();let chosen=options[0],depthDone=0;
 const evaluate=()=>g.board().flat().reduce((score,p)=>{if(!p)return score;const [x,y]=xy(p.square),advance=p.color==='w'?6-y:y-1;const position=p.type==='p'?advance*7:p.type==='n'||p.type==='b'?(7-Math.abs(3.5-x)-Math.abs(3.5-y))*6:0;return score+(p.color===g.turn()?1:-1)*(values[p.type]+position);},0);
 const ordered=()=>g.moves({verbose:true}).sort((a,b)=>((b.captured?values[b.captured]:0)+(b.promotion?values[b.promotion]:0))-((a.captured?values[a.captured]:0)+(a.promotion?values[a.promotion]:0)));
 function search(depth:number,alpha:number,beta:number,ply:number):number{if(Date.now()>deadline)throw Error('time');if(g.isCheckmate())return -100000+ply;if(g.isDraw())return 0;if(!depth)return evaluate();let best=-Infinity;for(const m of ordered()){g.move(m);let v;try{v=-search(depth-1,-beta,-alpha,ply+1);}finally{g.undo();}best=Math.max(best,v);alpha=Math.max(alpha,v);if(alpha>=beta)break;}return best;}
 for(let depth=1;depth<=3;depth++){try{let top=-Infinity,candidate=chosen;for(const m of options){g.move(m);let v;try{v=-search(depth-1,-Infinity,-top,1);}finally{g.undo();}if(v>top){top=v;candidate=m;}}chosen=candidate;depthDone=depth;if(top>99000)break;}catch{break;}}
 if(!chosen)return {title:outcome(g)||'没有可走的棋',why:'当前没有合法走法。',purpose:'可以重新开始或返回摆局。',idiom:'',depth:depthDone};
 const move={from:chosen.from,to:chosen.to,promotion:chosen.promotion};const applied=g.move(move),checked=applied.san.includes('+'),escape=new Chess(fen).isCheck();
 return {move,title:label(applied),why:explainMove(applied),purpose:applied.san.endsWith('#')?'本方完成将死。':escape?'先化解对王的威胁，再考虑进攻。':applied.captured?'争取子力收益；仍须观察对手是否能回吃。':checked?'迫使对方先应将，争取主动。':`${sideName(side)}改善棋子活动范围；这是有限搜索中的推荐，不保证全局最佳。`,idiom:applied.san.endsWith('#')?'一锤定音':escape?'转危为安':applied.captured?'权衡利弊':'稳扎稳打',depth:depthDone};
}
