/* Copyright (c) 2026 Celia. All rights reserved. */
const assert={ok(v:unknown,m='assertion failed'){if(!v)throw Error(m);},equal(a:unknown,b:unknown,m='values differ'){if(a!==b)throw Error(m);},deepEqual(a:unknown,b:unknown,m='values differ'){if(JSON.stringify(a)!==JSON.stringify(b))throw Error(m+': '+JSON.stringify(a));}};
import {puzzles,attemptPuzzle,isMate} from './puzzles.ts';
import {apply,initial,inCheck,moves,other,reason,type Side} from './rules.ts';
import {positionIssues} from './position.ts';
for(const p of puzzles){
 assert.deepEqual(positionIssues(p.board,'red'),[],p.name+' initial position');
 let board=p.board,turn:Side='red';
 for(const [i,step] of p.line.entries()){
  const piece=board.find(q=>q.id===step.move.id)!;
  assert.equal(piece.side,turn,p.name+' side '+i);
  assert.equal(reason(board,piece,step.move.x,step.move.y),null,p.name+' legal step '+i);
  if(turn==='red')assert.ok(attemptPuzzle(p,board,i,step.move).accepted,p.name+' accepted solution');
  board=apply(board,step.move);turn=other(turn);
 }
 if(p.goal==='mate')assert.ok(isMate(board),p.name+' checkmate');
 if(p.goal==='stalemate'){assert.equal(inCheck(board,'black'),false);assert.equal(moves(board,'black').length,0);}
 if(p.goal==='escape'){assert.ok(inCheck(p.board,'red'));assert.equal(inCheck(board,'red'),false);}
 if(p.goal==='gain')assert.ok(!board.some(q=>q.side==='black'&&q.kind==='r'));
 if(p.goal==='technique')assert.ok(moves(board,'black').every(m=>m.id!=='n'));
 console.log('PASS',p.name);
}
assert.deepEqual(positionIssues(initial(),'red'),[]);
assert.ok(positionIssues(initial().filter(p=>p.id!=='red4'),'red').some(s=>s.includes('一位')));
assert.ok(positionIssues(initial().map(p=>p.id==='red0'?{...p,x:0,y:8}:p),'red').length===0);
assert.ok(positionIssues(initial().map(p=>p.id==='red2'?{...p,x:3,y:5}:p),'red').some(s=>s.includes('象位')));
assert.ok(positionIssues(initial().map(p=>p.id==='redp2'?{...p,x:0,y:5}:p),'red').some(s=>s.includes('两枚未过河')));
assert.ok(positionIssues([{id:'r',side:'red',kind:'k',x:4,y:9},{id:'b',side:'black',kind:'k',x:4,y:0}],'red').some(s=>s.includes('照面')));
const first=puzzles[0],bad=attemptPuzzle(first,first.board,0,{id:'r',x:0,y:3});assert.equal(bad.accepted,false);assert.equal(bad.complete,false);
console.log(`${puzzles.length} puzzle solutions and position checks passed.`);
