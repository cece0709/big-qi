/* Copyright (c) 2026 Celia. All rights reserved. */
import {initial,apply,reason,type Piece} from './rules.ts';
import {analyze,validatePosition} from './teaching.ts';
function assert(v:unknown,label:string){if(!v)throw Error(label);console.log('PASS',label)}
const b=initial();assert(validatePosition(b,'red')===null,'standard setup accepted');assert(!!validatePosition(b.filter(p=>p.kind!=='k'||p.side!=='red'),'red'),'missing king rejected');assert(!!validatePosition(b.map(p=>p.id==='red4'?{...p,x:0}:p),'red'),'king outside palace rejected');assert(!!validatePosition(b.map(p=>p.id==='red2'?{...p,x:3,y:5}:p),'red'),'invalid elephant position rejected');
const a=analyze(b,'red');assert(a.move&&!reason(b,b.find(p=>p.id===a.move!.id)!,a.move.x,a.move.y),'recommended move legal');assert(a.why&&a.use&&a.idiom,'recommendation has explanations');
const puzzle:Piece[]=[{id:'rk',side:'red',kind:'k',x:4,y:9},{id:'bk',side:'black',kind:'k',x:5,y:0},{id:'rr',side:'red',kind:'r',x:0,y:2}];const mate=analyze(puzzle,'red');assert(mate.idiom==='一锤定音','mate explanation follows board');assert(!!validatePosition(apply(puzzle,{id:'bk',x:4,y:0}),'red'),'facing generals rejected');
console.log('Teaching checks passed');
