import {useRef,useState} from 'react';
import {difficultyNames,type Difficulty} from '../game/difficulty';
export default function DifficultyPicker({value,started,onChange}:{value:Difficulty;started:boolean;onChange:(v:Difficulty)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[pending,setPending]=useState(value);
 return <div className="difficulty-picker"><label>陪练难度 <select value={value} onChange={e=>{const v=e.target.value as Difficulty;if(started){setPending(v);dialog.current?.showModal();}else onChange(v);}}>{Object.entries(difficultyNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><small>{value==='easy'?'轻松试棋，允许慢慢摸索。':value==='hard'?'多想几步，练习更稳妥的应对。':'熟悉的陪练节奏，一步步成长。'}</small><dialog ref={dialog} className="position-dialog"><h2>换一种难度，重新出发</h2><p>切换难度后会重新开始这一局，学习进度会保留。</p><button className="primary" onClick={()=>{dialog.current?.close();onChange(pending);}}>切换并重新开始</button><button className="outline" onClick={()=>dialog.current?.close()}>继续当前棋局</button></dialog></div>;
}
