/* Copyright (c) 2026 Celia. All rights reserved. */
export default function App(){
 const [international,setInternational]=useState(location.hash.startsWith('#chess/')),[visited,setVisited]=useState(location.hash.startsWith('#chess/')),[sound,setSound]=useState(true);
 useEffect(()=>{const update=()=>{const chess=location.hash.startsWith('#chess/');setInternational(chess);if(chess)setVisited(true)};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[]);
 const routes=useRef({chinese:'home',chess:'chess/home'});
 function switchTo(chess:boolean){routes.current[international?'chess':'chinese']=location.hash.slice(1)||'home';if(chess)setVisited(true);setInternational(chess);location.hash=routes.current[chess?'chess':'chinese'];window.scrollTo({top:0});}
 return <><div hidden={international}><ChineseApp active={!international} onSwitch={()=>switchTo(true)} sound={sound} setSound={setSound}/></div>{visited&&<div hidden={!international}><InternationalApp active={international} onSwitch={()=>switchTo(false)} sound={sound} setSound={setSound}/></div>}</>;
}
import InternationalApp from './chess/InternationalApp';
import InstallApp from './components/InstallApp';
import TeachingPage from './pages/TeachingPage';
import './training.css';
import {setSoundEnabled,chessSound} from './game/sound';
import ReviewPage from './pages/ReviewPage';
import PuzzlesPage from './pages/PuzzlesPage';
import LearnPage from './pages/LearnPage';
import PlayPage from './pages/PlayPage';
import HomePage from './pages/HomePage';
import {useState,useEffect,useRef} from 'react';
import {House,BookOpen,Swords,Flag,History,VolumeX,ArrowUpRight,ArrowRight,ChevronRight,Undo2,Lightbulb,RotateCcw,Volume2,Leaf,Check,ChevronLeft,Menu,X} from 'lucide-react';
import Board from './components/Board';
import {initial,names,reason,apply,moves,suggest,other,inCheck,lessons,type Piece,type Side,type Kind,type Move} from './game/rules';
import type {Page,RecordStep} from './types';

const navigation=[{id:'home',label:'棋院首页',icon:House},{id:'play',label:'象棋对局',icon:Swords},{id:'learn',label:'入门教学',icon:BookOpen},{id:'teaching',label:'教学棋局',icon:Lightbulb},{id:'puzzles',label:'残局闯关',icon:Flag},{id:'review',label:'对局复盘',icon:History}] as const;
const puzzles=[{name:'一车定乾坤',desc:'红先，一步将杀。让车与帅默契配合。',board:[{id:'rk',side:'red',kind:'k',x:4,y:9},{id:'bk',side:'black',kind:'k',x:5,y:0},{id:'rr',side:'red',kind:'r',x:0,y:2}] as Piece[]},{name:'双车问将',desc:'红先，一步将杀。两辆车要互相保护。',board:[{id:'rk',side:'red',kind:'k',x:4,y:9},{id:'bk',side:'black',kind:'k',x:5,y:0},{id:'rr',side:'red',kind:'r',x:0,y:2},{id:'rr2',side:'red',kind:'r',x:3,y:1}] as Piece[]}];
function Brand(){return <div className="brand"><span className="brand-seal">弈</span><div>弈见<small>CELIA · XIANGQI</small></div></div>}
function ChineseApp({active,onSwitch,sound,setSound}:{active:boolean;onSwitch:()=>void;sound:boolean;setSound:(v:boolean)=>void}){const [page,setPage]=useState<Page>(navigation.some(n=>n.id===location.hash.slice(1))?location.hash.slice(1) as Page:'home');const [menu,setMenu]=useState(false);const [mode,setMode]=useState<'ai'|'local'>('ai');const [steps,setSteps]=useState<RecordStep[]>([{board:initial(),turn:'red',label:'开局 · 红方先行'}]);const [selected,setSelected]=useState<string|null>(null);const [message,setMessage]=useState('点一点红色棋子，看看它能去哪里。绿色小点就是可以走的位置。');const [ended,setEnded]=useState('');const [review,setReview]=useState(0);const [kind,setKind]=useState<Kind>('r');const [completed,setCompleted]=useState<Kind[]>([]);const [puzzle,setPuzzle]=useState<number|null>(null);const [solved,setSolved]=useState<number[]>([]);
const current=steps[steps.length-1];const board=current.board,turn=current.turn;
useEffect(()=>{const update=()=>{const p=location.hash.slice(1);if(navigation.some(n=>n.id===p))setPage(p as Page);};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[]);
function go(p:Page){location.hash=p;setPage(p);setMenu(false);if(p==='review')setReview(steps.length-1);}
function reset(nextMode=mode,puzzleIndex:number|null=null){setMode(nextMode);setPuzzle(puzzleIndex);setSteps([{board:puzzleIndex===null?initial():puzzles[puzzleIndex].board,turn:'red',label:'开局 · 红方先行'}]);setSelected(null);setEnded('');setMessage(puzzleIndex===null?'新的一局，不着急。点击红色棋子开始吧。':puzzles[puzzleIndex].desc);}
function commit(m:Move){const p=board.find(p=>p.id===m.id)!;const target=board.find(p=>p.x===m.x&&p.y===m.y);const next=apply(board,m);const nextTurn=other(turn);const options=moves(next,nextTurn);let finish='';if(!options.length)finish=(turn==='red'?'红方':'黑方')+'获胜'+(inCheck(next,nextTurn)?'，将杀！':'，对方无棋可走。');setSteps(s=>[...s,{board:next,turn:nextTurn,last:m,label:`${turn==='red'?'红':'黑'}${names[p.side][p.kind]}：${p.x+1}路${p.y+1}行 → ${m.x+1}路${m.y+1}行${target?'，吃'+names[target.side][target.kind]:''}`}]);setSelected(null);setEnded(finish);setMessage(finish||(inCheck(next,nextTurn)?'将军！帅（将）正受到攻击，下一步必须解除威胁。':target?'吃到棋子啦。也别忘记保护自己的棋子。':'走得不错，每一步都在积累棋感。'));
if(puzzle!==null){if(finish){setSolved(s=>Array.from(new Set([...s,puzzle])));setMessage('闯关成功！你找到了将杀的一步。');}else {setEnded('再想一想');setMessage('这一步还没有将杀。点击重新开始，再寻找能封住将所有退路的位置。');}}
}

useEffect(()=>{if(active&&mode==='ai'&&turn==='black'&&!ended&&puzzle===null&&(page==='play'||page==='home')){const timer=setTimeout(()=>{const m=suggest(board,'black');if(m)commit(m);},650);return()=>clearTimeout(timer);}},[steps,mode,ended,page,puzzle,active]);
function cell(x:number,y:number){if(ended){setMessage('本局已结束，可以重新开始或前往复盘。');return;}if(mode==='ai'&&turn==='black'&&puzzle===null){setMessage('弈见正在想下一步，请稍等。');return;}const clicked=board.find(p=>p.x===x&&p.y===y);if(clicked?.side===turn){setSelected(clicked.id===selected?null:clicked.id);setMessage(lessons[clicked.kind].rule);return;}const p=board.find(p=>p.id===selected);if(!p){setMessage(`先选择一枚${turn==='red'?'红':'黑'}方棋子，再点击想去的位置。`);return;}const error=reason(board,p,x,y);if(error){setMessage(error);return;}commit({id:p.id,x,y});}
function hint(){if(ended)return;if(mode==='ai'&&turn==='black')return;const m=suggest(board,turn);if(m){const p=board.find(p=>p.id===m.id)!;setSelected(p.id);setMessage(`试试把${names[p.side][p.kind]}走到第 ${m.x+1} 路、第 ${m.y+1} 行（从左上角开始数）。${lessons[p.kind].tip}`);}}
function undo(){const count=mode==='ai'&&turn==='red'&&puzzle===null?2:1;setSteps(s=>s.slice(0,Math.max(1,s.length-count)));setSelected(null);setEnded('');setMessage('退回一步，再想想也很好。');}
const demoBoard:Piece[]=[{id:'lk',side:'red',kind:'k',x:4,y:9},{id:'lbk',side:'black',kind:'k',x:3,y:0},{id:'lesson',side:'red',kind,x:kind==='a'?4:kind==='k'?4:4,y:kind==='a'?8:kind==='k'?9:kind==='b'?7:6}].filter((p,i)=>!(kind==='k'&&i===0)) as Piece[];
const [lessonPos,setLessonPos]=useState<Piece[]|null>(null);
return <div className="app"><aside className={'sidebar '+(menu?'open':'')}><Brand/><div className="side-caption">一方棋盘，一段静好时光</div><nav>{navigation.map(n=><button className={page===n.id?'active':''} key={n.id} onClick={()=>go(n.id)}><n.icon size={19}/><span>{n.label}</span>{page===n.id&&<i/>}</button>)}</nav><div className="side-bottom"><div className="quote-mark">“</div><p>棋不必走得快，<br/>每一步，都算成长。</p><span>慢慢来，弈见陪着你</span><div className="side-divider"/><div className="guest"><span className="avatar">初</span><div>初见棋友<small>学棋的第一天</small></div><Leaf size={17}/></div></div></aside><main><header><button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="打开导航">{menu?<X/>:<Menu/>}</button><div className="breadcrumb">弈见 <span>/</span> {navigation.find(n=>n.id===page)?.label||'棋院首页'}</div><div className="header-right"><span><i/> 慢慢学，步步有收获</span><button onClick={()=>{setSoundEnabled(!sound);setSound(!sound);if(!sound)chessSound('place')}} aria-pressed={sound} title={sound?'关闭落子音效':'开启落子音效'} aria-label={sound?'关闭落子音效':'开启落子音效'} className={sound?'sound-on':''}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><span className="avatar small">初</span></div></header>
<div className="content"><div className="variant-bar"><span><b>弈</b> 中国象棋 <small>XIANGQI</small></span><button onClick={onSwitch}>⇄ 切换到国际象棋</button></div>{page==='home'&&<HomePage go={go} reset={reset} board={board} selected={selected} cell={cell} message={message} setKind={setKind}/>} 
{page==='play'&&<PlayPage puzzle={puzzle} puzzles={puzzles} mode={mode} board={board} selected={selected} cell={cell} current={current} undo={undo} steps={steps} hint={hint} ended={ended} turn={turn} reset={reset} message={message} go={go}/>} 
{page==='learn'&&<LearnPage kind={kind} setKind={setKind} setLessonPos={setLessonPos} setMessage={setMessage} completed={completed} lessonPos={lessonPos} demoBoard={demoBoard} message={message} setCompleted={setCompleted}/>} 
{page==='puzzles'&&<PuzzlesPage/>} 
{page==='teaching'&&<TeachingPage active={active}/>}
{page==='review'&&<ReviewPage steps={steps} reset={reset} go={go} review={review} setReview={setReview}/>} 
<InstallApp/><footer className="copyright-footer"><span>© 2026 Celia. 保留所有权利。</span><a href="/copyright.html" target="_blank" rel="noreferrer">版权声明</a><span>弈见 · 一棋一会</span></footer></div></main></div>}
