import {apply,moves,other,type Piece,type Move,type Kind} from './rules';
const values:Record<Kind,number>={k:100,r:9,c:4.5,n:4,a:2,b:2,p:1};
// Warn only about a plainly undefended piece; this is not a claim of engine-perfect play.
export function riskyMove(board:Piece[],move:Move){const p=board.find(p=>p.id===move.id);if(!p)return '';const next=apply(board,move),enemy=moves(next,other(p.side));if(!enemy.length)return '';const captured=board.find(p=>p.x===move.x&&p.y===move.y);if(values[p.kind]-(captured?values[captured.kind]:0)<3)return '';const exposed=enemy.some(m=>{if(m.x!==move.x||m.y!==move.y)return false;const after=apply(next,m);return !moves(after,p.side).some(reply=>reply.x===m.x&&reply.y===m.y);});return exposed?'这一步可能让重要棋子失去保护，对方可以吃掉它。先看看有没有更稳妥的位置，也可以保留自己的想法继续试。':'';}
