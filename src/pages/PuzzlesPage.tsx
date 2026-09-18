/* Copyright (c) 2026 Celia. All rights reserved. */
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,Lightbulb,RotateCcw,Undo2} from 'lucide-react';
import {finishPuzzle,readProgress} from '../game/progress';
import MoveFeedback from '../components/MoveFeedback';
import Board from '../components/Board';
import PageTitle from '../components/PageTitle';
import {apply,type Move} from '../game/rules';
import {puzzles,goalText,notation,puzzleFrames,attemptPuzzle,type Puzzle} from '../game/puzzles';
import {techniques,techniqueSources} from '../game/techniques';

function Challenge({puzzle,onComplete}:{puzzle:Puzzle;onComplete:(id:string)=>void}){
 const [help,setHelp]=useState(0),[mistakes,setMistakes]=useState(0),[feedback,setFeedback]=useState('');
 const [history,setHistory]=useState([{board:puzzle.board,last:undefined as Move|undefined}]);
 const [selected,setSelected]=useState<string|null>(null),[message,setMessage]=useState('红方先行。点击棋子查看合法落点，再点击目标位置。');
 const [done,setDone]=useState(false),[hint,setHint]=useState(false),[answer,setAnswer]=useState(false),[cursor,setCursor]=useState(0);
 const answerBoards=useMemo(()=>puzzleFrames(puzzle),[puzzle]),ply=history.length-1;
 const frame=history[ply],board=answer?answerBoards[cursor]:frame.board;
 const waiting=!answer&&!done&&ply%2===1;
 useEffect(()=>{
  if(!waiting)return;
  const reply=puzzle.line[ply];if(!reply)return;
  const timer=setTimeout(()=>{setHistory(s=>[...s,{board:apply(s[s.length-1].board,reply.move),last:reply.move}]);setMessage('黑方应手：'+reply.why);},800);
  return()=>clearTimeout(timer);
 },[waiting,ply,puzzle]);
 function reset(){setHelp(0);setMistakes(0);setFeedback('');setHistory([{board:puzzle.board,last:undefined}]);setSelected(null);setDone(false);setHint(false);setAnswer(false);setCursor(0);setMessage('已恢复题面。红方先行，试着完成本关目标。');}
 function cell(x:number,y:number){
  if(answer||done||waiting)return;
  const target=board.find(p=>p.x===x&&p.y===y);
  if(target?.side==='red'){setSelected(target.id===selected?null:target.id);return;}
  if(!selected){setMessage('请先选择一枚红方棋子。');return;}
  const m={id:selected,x,y},result=attemptPuzzle(puzzle,board,ply,m);setMessage(result.message);
  if(!result.accepted){setMistakes(n=>n+1);setFeedback(result.message);return;}setFeedback('');
  setHistory(s=>[...s,{board:apply(board,m),last:m}]);setSelected(null);setHint(false);
  if(result.complete){const stars=help>=2?1:help===1||mistakes>0?2:3;finishPuzzle(puzzle.id,stars);setDone(true);onComplete(puzzle.id);setMessage('练习完成！获得 '+stars+' 颗星。'+result.message);}
 }
 return <div className="play-layout puzzle-workspace"><section className="game-panel">
  <div className="game-heading"><strong>{puzzle.name}</strong><span>{answer?'答案演示':done?'练习完成':waiting?'黑方应手中':'红方行棋'}</span></div>
  <Board board={board} selected={answer?null:selected} onCell={answer?undefined:cell} last={answer?(cursor?puzzle.line[cursor-1].move:undefined):frame.last} recommendation={answer?puzzle.line[cursor]?.move:help>=2&&hint&&!waiting&&!done?puzzle.line[ply]?.move:undefined}/>
  <p className="board-legend">坐标从棋盘左上角起算：从左到右为 1—9 路，从上到下为 1—10 行。</p>
  {answer?<div className="review-controls"><button className="outline" disabled={cursor===0} onClick={()=>setCursor(c=>c-1)}><ArrowLeft size={16}/>上一步</button><span>{cursor} / {puzzle.line.length}</span><button className="outline" disabled={cursor===puzzle.line.length} onClick={()=>setCursor(c=>c+1)}>下一步<ArrowRight size={16}/></button></div>:<div className="board-toolbar"><button disabled={ply===0} onClick={()=>{setHistory(s=>s.slice(0,Math.max(1,s.length-(ply%2===0?2:1))));setDone(false);setSelected(null);setHint(false);setMessage('已退回到你上次行棋前。');}}><Undo2 size={16}/>撤回</button><button disabled={done||waiting} onClick={()=>{setHelp(h=>Math.min(2,h+1));setHint(true);}}><Lightbulb size={16}/>{help===0?'思路提示':'具体走法'}</button><button onClick={reset}><RotateCcw size={16}/>重试</button></div>}
  {feedback&&<MoveFeedback message={feedback} onRetry={()=>setFeedback('')} onShow={()=>{setFeedback('');setHelp(2);setHint(true);setSelected(puzzle.line[ply]?.move.id||null);}}/>}
  <p className="teaching-message" role="status">{answer?(cursor?puzzle.line[cursor-1].why:'当前是题目初始局面，金色箭头表示第一步。点击下一步查看走法和解析。'):message}</p>
 </section><aside className="play-info"><div className="info-card puzzle-goal"><span className="small-label">本关目标</span><h2>{goalText[puzzle.goal]}</h2><p>红方 {puzzle.line.filter((_,i)=>i%2===0).length} 手参考路线 · {puzzle.category}</p><p>{puzzle.lesson}</p><small>三星：独立完成参考步数；两星：使用思路提示或重试走法；一星：查看具体走法或答案。保留最高星级。</small>{hint&&!answer&&<div className="idiom"><strong>想一想</strong><p>{puzzle.hint}</p></div>}<button className="primary full" onClick={()=>{setHelp(2);setAnswer(s=>!s);setCursor(0);setSelected(null);}}><BookOpen size={17}/>{answer?'回到我的练习':'查看答案与逐步解析'}</button>{answer&&<p className="analysis-note">演示不计通关；返回练习会保留你刚才的棋局。练习接受参考路线，以及直接达成本关将杀、困毙或解将目标的其他走法。</p>}</div>
 <div className="info-card solution-panel"><h3>{answer?'参考答案':'学会这一招'}</h3>{answer?<ol className="solution-list">{puzzle.line.map((s,i)=><li key={i}><button aria-current={cursor===i+1?'step':undefined} className={cursor===i+1?'active':''} onClick={()=>setCursor(i+1)}><strong>{i+1}. {notation(answerBoards[i],s.move)}</strong><span>{s.why}</span></button></li>)}</ol>:<><p>先看对方的将能去哪里，再检查自己的进攻子是否有保护。</p><p>走错会保留题面，提示可以分步打开。多步题会自动演示黑方的一条合法应对。</p></>}<button className="outline full" onClick={reset}>从题面重新练习 <RotateCcw size={16}/></button></div></aside></div>;
}

export default function PuzzlesPage(){
 const [active,setActive]=useState(puzzles[0]),[solved,setSolved]=useState<string[]>(()=>Object.keys(readProgress().puzzles)),[category,setCategory]=useState('全部'),[query,setQuery]=useState(''),[tab,setTab]=useState<'puzzles'|'techniques'>('puzzles');
 const [attempt,setAttempt]=useState(0),workspace=useRef<HTMLDivElement>(null),categories=['全部',...new Set(techniques.map(t=>t.category))];
 const matches=(p:{name:string;category:string})=>(category==='全部'||p.category===category)&&p.name.includes(query.trim());
 const visiblePuzzles=puzzles.filter(matches),visibleTechniques=techniques.filter(matches);
 function choose(p:Puzzle){const index=puzzles.indexOf(p);if(index>0&&!solved.includes(puzzles[index-1].id))return;setActive(p);setAttempt(n=>n+1);requestAnimationFrame(()=>workspace.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));}
 return <div className="puzzle-page"><PageTitle tag="残局闯关 · 一招一解" title="识棋形，懂棋理。" description={`${puzzles.length} 道互动练习 · ${techniques.length} 条常见技巧 · 每题附答案和逐步解析`}/>
 <div ref={workspace} className="puzzle-anchor"><Challenge key={active.id+attempt} puzzle={active} onComplete={id=>setSolved(s=>s.includes(id)?s:[...s,id])}/></div>
 <section className="puzzle-library" aria-label="残局与技巧题库"><div className="library-heading"><h2>棋谱小藏</h2><span>累计已通过 {solved.length} / {puzzles.length}</span></div>
 <div className="library-tabs" role="group" aria-label="内容类型"><button aria-pressed={tab==='puzzles'} onClick={()=>setTab('puzzles')}>互动闯关 · {puzzles.length}</button><button aria-pressed={tab==='techniques'} onClick={()=>setTab('techniques')}>技巧与解析 · {techniques.length}</button></div>
 <div className="library-filters"><label>技巧分类<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>查找技巧<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="例如：马后炮、解将"/></label></div>
 {tab==='puzzles'?<div className="challenge-grid">{visiblePuzzles.map(p=><button key={p.id} disabled={puzzles.indexOf(p)>0&&!solved.includes(puzzles[puzzles.indexOf(p)-1].id)} className={'challenge-card '+(active.id===p.id?'current':'')} onClick={()=>choose(p)}><span className="small-label">{p.category} · 红方 {p.line.filter((_,i)=>i%2===0).length} 手</span><h3>{puzzles.indexOf(p)+1}. {p.name}</h3><span>{'★'.repeat(readProgress().puzzles[p.id]||0)}{'☆'.repeat(3-(readProgress().puzzles[p.id]||0))}</span><p>{goalText[p.goal]}</p><span className="challenge-action">{solved.includes(p.id)?<><Check size={15}/>已练习，再来一次</>:<>{puzzles.indexOf(p)>0&&!solved.includes(puzzles[puzzles.indexOf(p)-1].id)?'通过前一关解锁':'开始练习'}<ArrowRight size={15}/></>}</span></button>)}</div>:<div className="technique-grid">{visibleTechniques.map(t=><details className="technique-card" key={t.name}><summary><span>{t.name}</span><small>{t.category}</small></summary><p>{t.summary}</p><p>{t.note}</p>{t.puzzleId?<button className="text-button" onClick={()=>choose(puzzles.find(p=>p.id===t.puzzleId)!)}>练习相关棋形 <ArrowRight size={15}/></button>:<span className="analysis-note">本条为技巧讲解，暂未配独立关卡。</span>}</details>)}</div>}
 {(tab==='puzzles'?visiblePuzzles:visibleTechniques).length===0&&<p className="library-empty">当前分类没有匹配结果。可以清空关键词或选择“全部”。</p>}
 <details className="source-note"><summary>收录范围与参考资料</summary><p>收录常见杀法、得子与解围手段、残局基本思路；不是全部市售棋谱或完整残局数据库。互动题面与中文解析为本项目独立编排，未搬运付费题库。传统技法名称和分类参照公开教学资料；同名技巧在不同教材中可能有差别。</p><p>题库答案按本应用棋规校验。多步题展示参考应对，完整比赛的长将长捉、循环与限步裁定不在本题库范围内。</p><ul>{techniqueSources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul></details>
 </section></div>;
}
