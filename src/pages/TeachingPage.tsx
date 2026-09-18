/* Copyright (c) 2026 Celia. All rights reserved. */
import {useEffect,useMemo,useRef,useState} from 'react';
import {LockKeyhole,Unlock,Lightbulb,RotateCcw,Undo2,ArrowRight} from 'lucide-react';
import MoveFeedback from '../components/MoveFeedback';
import {riskyMove} from '../game/feedback';
import {recordMove} from '../game/progress';
import Board from '../components/Board';
import PageTitle from '../components/PageTitle';
import {initial,apply,basic,reason,names,other,inCheck,moves,type Piece,type Side,type Move} from '../game/rules';
import {positionIssues} from '../game/position';
import {researchMoves} from '../game/research';
import type {Advice} from '../game/teaching';
type Frame={board:Piece[];turn:Side;last?:Move};
export default function TeachingPage({active=true}:{active?:boolean}){
 const [feedback,setFeedback]=useState(''),[pending,setPending]=useState<Move|null>(null);
 const [frames,setFrames]=useState<Frame[]>([{board:initial(),turn:'red'}]),[locked,setLocked]=useState(false),[player,setPlayer]=useState<Side>('red');
 const [selected,setSelected]=useState<string|null>(null),[placing,setPlacing]=useState<Piece|null>(null),[message,setMessage]=useState('先点棋子，再点空位，可以自由摆放双方棋子。摆好后点击“锁定并开始对弈”。');
 const [advice,setAdvice]=useState<Advice|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[lastExplanation,setLastExplanation]=useState('');
 const [research,setResearch]=useState(false),[confirming,setConfirming]=useState(false),[lockIssues,setLockIssues]=useState<string[]>([]);
 const dialog=useRef<HTMLDialogElement>(null),frame=frames[frames.length-1],{board,turn}=frame;
 const issues=useMemo(()=>positionIssues(board,turn),[board,turn]),invalid=issues.length>0;
 const finished=useMemo(()=>locked&&!research&&!moves(board,turn).length,[board,turn,locked,research]);
 const noResearchMoves=locked&&research&&!researchMoves(board,turn).length;
 useEffect(()=>{if(confirming&&active)dialog.current?.showModal();else dialog.current?.close();},[confirming,active]);
 useEffect(()=>{
  setAdvice(null);setError('');if(!active||(invalid&&!research)||finished){setBusy(false);return;}
  setBusy(true);const worker=new Worker(new URL('../game/teaching.worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{setBusy(false);if(data.error)setError(data.error);else setAdvice(data.advice);};
  worker.onerror=()=>{setBusy(false);setError('分析暂时失败，请点击重新分析。');};worker.postMessage({board,turn,research});
  return()=>worker.terminate();
 },[board,turn,invalid,research,retry,finished,active]);
 function move(m:Move){setFeedback('');setPending(null);
  const p=board.find(p=>p.id===m.id);if(!p||p.side!==turn||(research?basic:reason)(board,p,m.x,m.y))return;
  recordMove();const next=apply(board,m);setFrames(s=>[...s,{board:next,turn:other(turn),last:m}]);setSelected(null);setAdvice(null);
  setLastExplanation(advice?.move?.id===m.id&&advice.move.x===m.x&&advice.move.y===m.y?`采用推荐：${advice.why} ${advice.use}`:`你选择了${names[p.side][p.kind]}到${m.x+1}路${m.y+1}行。正在分析后续变化。`);
  setMessage(research?'研究落子完成，暂不判断将帅安全和胜负。':inCheck(next,other(turn))?'将军！下一方必须先解除威胁。':'已落子，正在分析下一步。');
 }
 useEffect(()=>{if(!active||!locked||turn===player||finished||confirming||!advice?.move)return;const timer=setTimeout(()=>move(advice.move!),900);return()=>clearTimeout(timer);},[locked,turn,player,finished,confirming,advice,board,active]);
 function edit(next:Piece[]){setFrames(s=>[...s,{board:next,turn}]);setSelected(null);setPlacing(null);setLastExplanation('');}
 function click(x:number,y:number){const target=board.find(p=>p.x===x&&p.y===y);
  if(!locked){if(placing){if(target){setMessage('这里已有棋子，请选择空位。');return;}edit([...board,{...placing,x,y}]);return;}if(target){setSelected(target.id===selected?null:target.id);setMessage('可以移动到任意空位，或点击“移出选中棋子”。');return;}if(selected)edit(board.map(p=>p.id===selected?{...p,x,y}:p));return;}
  if(finished||noResearchMoves){setMessage('本方没有可走的棋子，可以解锁调整。');return;}if(turn!==player){setMessage('现在由对方行棋，请稍等。');return;}
  if(target?.side===player){setSelected(target.id===selected?null:target.id);return;}
  const p=board.find(p=>p.id===selected);if(!p){setMessage('请先选择本方棋子。');return;}
  const issue=(research?basic:reason)(board,p,x,y);if(issue){setMessage(issue);setFeedback(issue);setPending(null);return;}const m={id:p.id,x,y},warning=research?'':riskyMove(board,m);if(warning){setFeedback(warning);setPending(m);return;}move(m);
 }
 function start(asResearch=false){setConfirming(false);setResearch(asResearch);setLocked(true);setFrames([frame]);setSelected(null);setPlacing(null);setAdvice(null);setMessage(asResearch?'已保留原局面，进入非标准研究模式。只限制基本走法，不判断将帅安全和胜负。':`检查通过，局面已锁定。你执${player==='red'?'红':'黑'}，对方由 AI 操控。`);}
 function restore(){setFeedback('');setPending(null);setConfirming(false);setLocked(false);setResearch(false);setFrames([{board:initial(),turn:'red'}]);setSelected(null);setPlacing(null);setAdvice(null);setLastExplanation('');setMessage('已恢复标准开局，可以重新摆局或锁定开始。');}
 function toggleLock(){setFeedback('');setPending(null);
  if(locked){setLocked(false);setResearch(false);setSelected(null);setMessage('已解锁，可以继续摆放双方棋子。');return;}
  const found=positionIssues(board,turn);
  if(found.length){setLockIssues(found);setConfirming(true);setMessage('棋局不合理，请选择恢复、调整或继续研究。');return;}
  start();
 }
 const reserve=initial().filter(p=>!board.some(q=>q.id===p.id));
 return <><PageTitle tag="教学棋局 · 边下边懂" title="摆一局，问一招。" description="自由摆局找思路，锁定一方练实战。每一步，都知道为什么。"/>
 <div className="play-layout teaching-layout"><section className="game-panel"><div className="game-heading"><strong>{locked?(research?'非标准研究 · 你执':'实战教学 · 你执')+(player==='red'?'红':'黑'):'自由摆局 · 双方均可调整'}</strong><span>当前：{turn==='red'?'红方':'黑方'}</span></div>
 {research&&<p className="research-banner" role="status">非标准研究：保留原摆局；只按棋子基本走法移动，不校验将帅安全、不判胜负。修正局面后重新锁定可回到正常对弈。</p>}
 <Board board={board} selected={selected} onCell={click} last={frame.last} freePlacement={!locked} research={research} recommendation={advice?.move}/><p className="board-legend">金色箭头：当前推荐走法 · 坐标从棋盘左上角起算</p>
 <div className="board-toolbar"><button disabled={frames.length<2} onClick={()=>{const count=locked&&turn===player?2:1;setFrames(s=>s.slice(0,Math.max(1,s.length-count)));setSelected(null);setAdvice(null);setLastExplanation('');}}><Undo2 size={16}/>撤回</button><button onClick={restore}><RotateCcw size={16}/>标准开局</button></div>
 {feedback&&<MoveFeedback message={feedback} onRetry={()=>{setFeedback('');setPending(null);}} onShow={()=>{setFeedback('');setPending(null);if(advice?.move){setSelected(advice.move.id);setMessage(advice.title+'。'+advice.why);}}} onContinue={pending?()=>move(pending):undefined}/>}
 <p className="teaching-message" aria-live="polite">{finished?`${turn==='red'?'红方':'黑方'}无合法走法，本局结束。`:noResearchMoves?'当前一方没有可演示走法，请解锁补子或调整棋局。':message}</p></section>
 <aside className="play-info"><div className="info-card"><h3>{locked?<LockKeyhole size={19}/>:<Unlock size={19}/>} {locked?(research?'已锁定 · 非标准研究':'锁定一方 · 正常对弈'):'自由研究 · 未锁定'}</h3>
 <div className="teaching-selects"><label>我执哪方<select value={player} disabled={locked} onChange={e=>setPlayer(e.target.value as Side)}><option value="red">红方</option><option value="black">黑方</option></select></label><label>谁先走<select disabled={locked} value={turn} onChange={e=>setFrames(s=>[...s,{board,turn:e.target.value as Side}])}><option value="red">红方</option><option value="black">黑方</option></select></label></div>
 <button className="primary full" onClick={toggleLock}>{locked?'解锁，继续摆局':'锁定并开始对弈'}{locked?<Unlock size={16}/>:<LockKeyhole size={16}/>}</button>
 {!locked&&<><p className="muted">选中棋子后点空位移动；点备用棋子再点空位可放回棋盘。锁定时会检查双方将帅、棋子位置、数量和行棋方。</p><button className="outline full" disabled={!selected} onClick={()=>edit(board.filter(p=>p.id!==selected))}>移出选中棋子</button><div className="reserve">{reserve.map(p=><button key={p.id} className={(p.side==='red'?'red-text ':'')+(placing?.id===p.id?'chosen':'')} onClick={()=>{setPlacing(placing?.id===p.id?null:p);setSelected(null);}} aria-label={`放回${p.side==='red'?'红':'黑'}${names[p.side][p.kind]}`}>{names[p.side][p.kind]}</button>)}</div>{invalid&&<p className="position-warning" role="status">发现 {issues.length} 项问题：{issues[0]} 点击锁定可查看详情并选择如何开始。</p>}</>}
 </div><div className="info-card advice-card" aria-live="polite"><h3><Lightbulb size={19}/> {research?'研究走法示例':'当前分析推荐'}</h3><p className="analysis-note">{research?'按基本走法比较吃子与位置，不代表正常对局最优解。':`本地 AI · ${advice?.depth?`${advice.depth} 层搜索完成`:'最多 3 层搜索'} · 有限深度推荐，不保证全局唯一最佳。`}</p>
 {busy?<p>正在比较走法和对方的应对…</p>:error?<><p>{error}</p><button className="outline" onClick={()=>setRetry(x=>x+1)}>重新分析</button></>:invalid&&!research?<p>修正棋局后会自动分析；也可点击锁定，选择保留原局面继续研究。</p>:finished?<p>本局已结束，可解锁研究或恢复标准开局。</p>:advice&&<><h4>{advice.title}</h4><dl><dt>为什么这样走</dt><dd>{advice.why}</dd><dt>这一步有什么用</dt><dd>{advice.use}</dd></dl>{advice.idiom&&<div className="idiom"><strong>{advice.idiom}</strong><p>{advice.idiomMeaning}</p><small>帮助理解的比喻，并非棋局定式名称</small></div>}<p className="analysis-note">{advice.risk}</p><button className="outline full" disabled={!locked||turn!==player||!advice.move||finished} onClick={()=>advice.move&&move(advice.move)}>按推荐走一步 <ArrowRight size={15}/></button></>}
 {lastExplanation&&<div className="last-analysis"><strong>上一手回顾</strong><p>{lastExplanation}</p></div>}</div></aside></div>
 <dialog ref={dialog} className="position-dialog" aria-labelledby="position-dialog-title" aria-describedby="position-dialog-description" onCancel={()=>setConfirming(false)}>
 <h2 id="position-dialog-title">棋局不合理</h2><p id="position-dialog-description">检查发现以下问题。你可以恢复标准开局、返回修改，或保留当前棋子继续研究。</p><ul>{lockIssues.map(issue=><li key={issue}>{issue}</li>)}</ul><p className="research-banner">继续开始将进入非标准研究：仍只操控你选择的一方，但只检查棋子基本走法，不校验将帅安全，不判断正常胜负。</p>
 <div className="dialog-actions"><button className="primary" onClick={restore}>恢复标准开局</button><button className="outline" onClick={()=>start(true)}>仍然开始研究</button><button className="text-button" autoFocus onClick={()=>setConfirming(false)}>返回调整</button></div></dialog></>;
}
