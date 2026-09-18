import {moves,suggest,type Piece,type Side} from './rules';
import {search} from './search';
export type Difficulty='easy'|'medium'|'hard';
export const difficultyNames={easy:'简单',medium:'中等',hard:'困难'};
export function readDifficulty():Difficulty{try{const v=localStorage.getItem('yijian-difficulty');return v==='easy'||v==='hard'?v:'medium';}catch{return 'medium';}}
export function saveDifficulty(v:Difficulty){try{localStorage.setItem('yijian-difficulty',v);}catch{/* Storage may be disabled. */}}
export function opponent(board:Piece[],side:Side,difficulty:Difficulty){if(difficulty==='easy'){const legal=moves(board,side);return legal[Math.floor(Math.random()*legal.length)];}return difficulty==='hard'?search(board,side,3000,4).move:suggest(board,side);}
