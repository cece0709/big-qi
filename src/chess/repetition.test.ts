const assert={equal:(a:unknown,b:unknown)=>{if(a!==b)throw Error(String(a)+' !== '+String(b));}};
import {Chess,analyze,replay,type GameState} from './engine';
const state:GameState={start:'1r1qkb1r/2p1pp2/1pn2np1/pN1p1bNp/P4B1P/RPPPPPP1/4B3/3QK2R w - - 0 20',line:[]};
const game=new Chess(state.start);
for(const san of ['Ra2','Rc8','Ra3','Rb8','Ra2','Rc8','Ra3','Rb8']){const m=game.move(san);state.line.push({from:m.from,to:m.to});}
assert.equal(replay(state).isThreefoldRepetition(),true);
assert.equal(analyze(state,200).move,undefined);
assert.equal(replay({...state,line:state.line.slice(0,-1)}).isThreefoldRepetition(),false);
assert.equal(replay({...state,line:[]}).isThreefoldRepetition(),false);
const escape:GameState={start:'6qk/8/8/8/8/8/8/K7 b - - 0 1',line:[]},g=new Chess(escape.start);
for(const san of ['Qg7+','Kb1','Qg8','Ka1','Qg7+','Kb1','Qg8']){const m=g.move(san);escape.line.push({from:m.from,to:m.to});}
const advice=analyze(escape,1500);assert.equal(advice.move?.from,'b1');assert.equal(advice.move?.to,'a1');
console.log('Repetition end, undo/reset history and necessary drawing retreat passed.');
