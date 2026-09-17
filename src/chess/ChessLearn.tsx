/* Copyright (c) 2026 Celia. All rights reserved. */
import {useMemo,useState} from 'react';
import ChessBoard from './ChessBoard';
import {Chess,glyphs,illegalExplanation,pieceNames,type PieceSymbol,type Square} from './engine';
import {lessons} from './data';
const examples:Record<PieceSymbol,string>={k:'7k/8/8/8/3K4/8/8/8 w - - 0 1',q:'7k/8/8/8/3Q4/8/8/K7 w - - 0 1',r:'7k/8/8/8/3R4/8/8/K7 w - - 0 1',b:'7k/8/8/8/3B4/8/8/K7 w - - 0 1',n:'7k/8/8/8/3N4/8/8/K7 w - - 0 1',p:'7k/8/8/8/8/2p1p3/3P4/K7 w - - 0 1'};
export default function ChessLearn(){const [kind,setKind]=useState<PieceSymbol>('n'),[fen,setFen]=useState(examples.n),[selected,setSelected]=useState<Square|null>('d4'),[message,setMessage]=useState('试着点击一个绿色落点。这里是单步走法练习。');const game=useMemo(()=>new Chess(fen),[fen]),legal=selected?game.moves({square:selected,verbose:true}):[];
function reset(t=kind){setKind(t);setFen(examples[t]);setSelected(t==='p'?'d2':'d4');setMessage('绿色落点已显示。点击一个格子，练习这枚棋子的走法。');}
return <><div className="chess-lesson-tabs">{(['k','q','r','b','n','p'] as PieceSymbol[]).map(t=><button key={t} className={t===kind?'chosen':''} onClick={()=>reset(t)}><span>{glyphs[t]}</span>{pieceNames[t]}</button>)}</div><div className="play-layout chess-play-layout"><section className="game-panel"><ChessBoard fen={fen} selected={selected} legal={legal.map(m=>m.to)} onSquare={s=>{if(game.turn()==='b'){setMessage('这一手练习完成，点击重新练习可再试一次。');return;}if(game.get(s)?.color==='w'){setSelected(s);return;}if(!selected)return;const m=legal.find(m=>m.to===s);if(!m){setMessage(illegalExplanation(game,selected,s));return;}game.move(m);setFen(game.fen());setSelected(null);setMessage('走对了！'+lessons[kind].rule);}}/><p className="teaching-message" role="status">{message}</p><button className="outline" onClick={()=>reset()}>重新练习</button></section><div className="info-card lesson-copy"><span className="eyebrow">从一枚棋子开始</span><h2>{lessons[kind].name}</h2><p>{lessons[kind].rule}</p><div className="rule-note"><h3>记住这一点</h3><p>{lessons[kind].tip}</p></div><p className="analysis-note">这是走法演示，不计算胜负。白兵向数字增大的方向走，黑兵反向。</p></div></div><div className="chess-rule-grid">{[
['王车易位','王向车方向走两格，车移到王的另一侧。两子都未移动过、途中无子、王未被将军且不经过受攻击的格子，才可以易位。操作时点王，再点 c1 或 g1（黑方 c8 或 g8）。'],
['吃过路兵','对方兵刚从起始位置前进两格，停在你的兵旁边，你可以像它只走一格那样斜吃它。必须在紧接着的一手使用，不能以后再补。'],
['兵的升变','兵走到底线，必须选择变成后、车、象或马。对弈时会弹出选择框；不限于之前被吃掉的棋子。'],
['将死与逼和','将军后没有任何合法解救方式，叫将死；没有被将军却无合法走法，叫逼和，结果是平局。这与中国象棋的困毙判负不同。']
].map(([title,text])=><section className="info-card" key={title}><h3>{title}</h3><p>{text}</p></section>)}</div><p className="analysis-note">规则参考：<a href="https://handbook.fide.com/chapter/E012023" target="_blank" rel="noreferrer">FIDE 国际象棋规则</a>。本练习采用页面注明的自动判和方式。</p></>;
}
