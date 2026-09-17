/* Copyright (c) 2026 Celia. All rights reserved. */
import {initial,moves,reason,apply,inCheck,type Piece} from './rules.ts';
function assert(value:unknown,label:string){if(!value)throw Error(label);console.log('PASS',label)}
const b=initial();assert(b.length===32,'32 initial pieces');assert(moves(b,'red').length===44,'44 legal opening moves');
const horse=b.find(p=>p.id==='red1')!;assert(!reason(b,horse,2,7),'horse normal move');assert(!!reason([...b,{id:'block',side:'red',kind:'p',x:1,y:8}],horse,2,7),'blocked horse leg');
const elephant=b.find(p=>p.id==='red2')!;assert(!!reason([...b,{id:'eye',side:'red',kind:'p',x:3,y:8}],elephant,4,7),'blocked elephant eye');
const cannon=b.find(p=>p.id==='redc1')!;assert(!reason(b,cannon,1,0),'cannon one screen capture');assert(!!reason(b,cannon,1,2),'cannon cannot capture without screen');
const facing:Piece[]=[{id:'r',side:'red',kind:'k',x:4,y:9},{id:'b',side:'black',kind:'k',x:4,y:0},{id:'p',side:'red',kind:'p',x:4,y:4}];assert(!!reason(facing,facing[2],3,4),'generals cannot face');assert(!reason(facing,facing[2],4,3),'blocker can move forward');
const puzzle:Piece[]=[{id:'rk',side:'red',kind:'k',x:4,y:9},{id:'bk',side:'black',kind:'k',x:5,y:0},{id:'rr',side:'red',kind:'r',x:0,y:2}];const solutions=moves(puzzle,'red').filter(m=>{const n=apply(puzzle,m);return inCheck(n,'black')&&moves(n,'black').length===0});assert(solutions.length>0,'first puzzle has mate in one');
assert(moves([...puzzle,{id:'rr2',side:'red',kind:'r',x:3,y:1}],'red').some(m=>{const n=apply([...puzzle,{id:'rr2',side:'red',kind:'r',x:3,y:1}],m);return inCheck(n,'black')&&!moves(n,'black').length}),'second puzzle has mate in one');
console.log('All rule checks passed');
