/* Copyright (c) 2026 Celia. All rights reserved. */
import {Chess,DEFAULT_POSITION,analyze,readBoard,setupIssues,replay,researchTargets,type GameState} from './engine';
import {chessPuzzles} from './data';
function check(value:unknown,message:string){if(!value)throw new Error(message);console.log('PASS',message);}
check(new Chess().moves().length===20,'standard opening has 20 legal moves');
const castle=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');castle.move({from:'e1',to:'g1'});check(castle.get('f1')?.type==='r'&&castle.get('g1')?.type==='k','castling moves both pieces');
const attacked=new Chess('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1');check(!attacked.moves().includes('O-O'),'cannot castle through attack');
const ep=new Chess();['e4','a6','e5','d5'].forEach(m=>ep.move(m));check(ep.move('exd6').isEnPassant()&&!ep.get('d5'),'en passant removes bypassed pawn');
const staleEp=new Chess();['e4','a6','e5','d5','Nf3','a5'].forEach(m=>staleEp.move(m));check(!staleEp.moves().includes('exd6'),'en passant expires after one move');
for(const type of ['q','r','b','n'] as const){const g=new Chess('7k/P7/8/8/8/8/8/4K3 w - - 0 1');g.move({from:'a7',to:'a8',promotion:type});check(g.get('a8')?.type===type,'promotion choice '+type);}
const repetition:GameState={start:DEFAULT_POSITION,line:[]};const r=new Chess();for(const move of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']){const m=r.move(move);repetition.line.push({from:m.from,to:m.to});}check(replay(repetition).isThreefoldRepetition(),'replay retains repetition history');
check(new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1').isStalemate(),'stalemate is a draw');
check(setupIssues(readBoard(DEFAULT_POSITION),'w').length===0,'standard setup accepted');
check(setupIssues(readBoard(DEFAULT_POSITION).filter(p=>!(p.color==='w'&&p.type==='k')),'w').some(s=>s.includes('王')),'missing king detected');
check(setupIssues(readBoard('8/8/8/8/8/8/4k3/4K3 w - - 0 1'),'w').some(s=>s.includes('相邻')),'adjacent kings detected');
check(setupIssues(readBoard('P6k/8/8/8/8/8/8/K7 w - - 0 1'),'w').some(s=>s.includes('升变')),'unpromoted pawn on last rank detected');
check(researchTargets([{square:'a1',type:'r',color:'w'}],{square:'a1',type:'r',color:'w'}).includes('a8'),'nonstandard research works without kings');
for(const p of chessPuzzles){check(setupIssues(readBoard(p.fen),'w').length===0,p.id+' starts legally');const g=new Chess(p.fen);for(const m of p.line)g.move(m);if(p.goal==='mate')check(g.isCheckmate(),p.id+' finishes in checkmate');if(p.goal==='escape')check(!g.isAttacked('e1','b'),p.id+' resolves check');if(p.goal==='pin')check(g.moves({square:'e7'}).length===0,p.id+' pins knight');if(p.goal==='gain')check(g.history({verbose:true}).at(-1)?.captured==='r'&&!g.isGameOver(),p.id+' wins rook with play continuing');}
for(const fen of [DEFAULT_POSITION,chessPuzzles[0].fen,chessPuzzles.at(-1)!.fen]){const advice=analyze(fen,300);check(advice.move&&new Chess(fen).move(advice.move),'AI returns a legal move');}
