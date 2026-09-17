/* Copyright (c) 2026 Celia. All rights reserved. */
export type Side='red'|'black';
export type Kind='r'|'n'|'b'|'a'|'k'|'c'|'p';
export type Piece={id:string;side:Side;kind:Kind;x:number;y:number};
export type Move={id:string;x:number;y:number};
export const names:Record<Side,Record<Kind,string>>={red:{r:'车',n:'马',b:'相',a:'仕',k:'帅',c:'炮',p:'兵'},black:{r:'车',n:'马',b:'象',a:'士',k:'将',c:'炮',p:'卒'}};
export const other=(s:Side):Side=>s==='red'?'black':'red';
export function initial():Piece[]{const result:Piece[]=[];(['black','red'] as Side[]).forEach(side=>{const y=side==='red'?9:0;(['r','n','b','a','k','a','b','n','r'] as Kind[]).forEach((kind,x)=>result.push({id:side+x,side,kind,x,y}));[1,7].forEach(x=>result.push({id:side+'c'+x,side,kind:'c',x,y:side==='red'?7:2}));[0,2,4,6,8].forEach(x=>result.push({id:side+'p'+x,side,kind:'p',x,y:side==='red'?6:3}));});return result;}
export function apply(b:Piece[],m:Move){return b.filter(p=>!(p.x===m.x&&p.y===m.y&&p.id!==m.id)).map(p=>p.id===m.id?{...p,x:m.x,y:m.y}:p);}
export function basic(b:Piece[],p:Piece,x:number,y:number):string|null{
 if(x<0||x>8||y<0||y>9)return '棋子不能走出棋盘。';
 const target=b.find(q=>q.x===x&&q.y===y);if(target?.side===p.side)return '这里是自己的棋子，不能吃自己的伙伴哦。';
 const dx=x-p.x,dy=y-p.y,ax=Math.abs(dx),ay=Math.abs(dy);const occupied=(x:number,y:number)=>b.some(q=>q.x===x&&q.y===y);
 const between=b.filter(q=>dx===0?q.x===x&&q.y>Math.min(y,p.y)&&q.y<Math.max(y,p.y):dy===0&&q.y===y&&q.x>Math.min(x,p.x)&&q.x<Math.max(x,p.x)).length;
 switch(p.kind){
 case 'r':return dx!==0&&dy!==0?'车走直线，横着、竖着都可以。':between?'车的路被挡住啦，不能跳过其他棋子。':null;
 case 'c':return dx!==0&&dy!==0?'炮也要沿横线或竖线走。':target?(between===1?null:'炮吃子时，中间必须恰好隔一个棋子，叫作“炮架”。'):(between===0?null:'炮不吃子时不能跳过其他棋子。');
 case 'n':return !((ax===2&&ay===1)||(ax===1&&ay===2))?'马走“日”字：一边两格，另一边一格。':occupied(p.x+(ax===2?Math.sign(dx):0),p.y+(ay===2?Math.sign(dy):0))?'马腿被挡住啦！先迈出的一格不能有棋子。':null;
 case 'b':return ax!==2||ay!==2?'相走“田”字，斜着走两格。':(p.side==='red'?y<5:y>4)?'相不能过河，要留在自己的半边棋盘。':occupied(p.x+dx/2,p.y+dy/2)?'田字中间有棋子，堵住了“象眼”。':null;
 case 'a':return ax!==1||ay!==1?'仕每次斜着走一格。':x<3||x>5||(p.side==='red'?y<7:y>2)?'仕只能在带斜线的九宫里活动。':null;
 case 'k':if(target?.kind==='k'&&dx===0&&between===0)return null;return ax+ay!==1?'帅（将）每次只能横着或竖着走一格。':x<3||x>5||(p.side==='red'?y<7:y>2)?'帅（将）不能走出九宫。':null;
 case 'p':return dy===(p.side==='red'?-1:1)&&dx===0?null:dy===0&&ax===1&&(p.side==='red'?p.y<=4:p.y>=5)?null:'兵卒一次走一格，只能向前；过河后可以左右走，但永远不能后退。';
 }
}
export function inCheck(b:Piece[],side:Side){const k=b.find(p=>p.side===side&&p.kind==='k');return !k||b.some(p=>p.side!==side&&basic(b,p,k.x,k.y)===null);}
export function reason(b:Piece[],p:Piece,x:number,y:number){const err=basic(b,p,x,y);if(err)return err;return inCheck(apply(b,{id:p.id,x,y}),p.side)?'这样走会让自己的帅（将）被吃，或让两位将帅直接面对面。先保护好它吧。':null;}
export function moves(b:Piece[],side:Side):Move[]{return b.filter(p=>p.side===side).flatMap(p=>Array.from({length:90},(_,i)=>({id:p.id,x:i%9,y:Math.floor(i/9)})).filter(m=>!reason(b,p,m.x,m.y)));}
const values:Record<Kind,number>={k:10000,r:90,c:45,n:40,b:20,a:20,p:10};
function score(b:Piece[],side:Side){return b.reduce((s,p)=>s+(p.side===side?1:-1)*(values[p.kind]+(p.kind==='p'?(p.side==='red'?9-p.y:p.y)*2:0)),0);}
export function suggest(b:Piece[],side:Side){let best:Move|undefined;let bestScore=-Infinity;for(const m of moves(b,side)){const next=apply(b,m);const replies=moves(next,other(side));const worst=replies.length?Math.min(...replies.map(r=>score(apply(next,r),side))):100000;const v=worst+score(next,side)*.01+(4-Math.abs(m.x-4))*.001;if(v>bestScore){bestScore=v;best=m;}}return best;}
export const lessons:Record<Kind,{title:string;rule:string;tip:string}>={r:{title:'车行直路',rule:'横着走、竖着走，走几格都可以，但不能越过其他棋子。',tip:'先让车走到开阔的线上，它才能发挥力量。'},n:{title:'马踏日字',rule:'先直走一格，再向斜前方走一格，连起来像一个“日”字。',tip:'第一步旁边有棋子时，就叫“蹩马腿”，这条路走不通。'},b:{title:'相飞田字',rule:'沿对角线走两格，像一个“田”字。相不能过河。',tip:'田字中心有棋子时，就是“塞象眼”。'},a:{title:'仕守九宫',rule:'每次斜着走一格，而且始终留在九宫中。',tip:'仕是帅身边的护卫，别急着把它走开。'},k:{title:'帅坐中军',rule:'每次横着或竖着走一格，不能走出九宫。',tip:'两位将帅不能在同一条竖线上直接面对面。'},c:{title:'炮打隔山',rule:'不吃子时像车一样走；吃子时，必须隔着恰好一个棋子。',tip:'隔在中间的棋子叫“炮架”，双方的棋子都可以当炮架。'},p:{title:'小兵向前',rule:'过河前只能向前一格；过河后也能向左、向右走一格。',tip:'兵永远不能后退，每一步都值得想一想。'}};
