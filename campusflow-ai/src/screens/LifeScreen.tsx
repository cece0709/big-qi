import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createTimer, filterTasks, finishTimer, getTimerProgress, pauseTimer, resumeTimer } from '../core';
import type { Task, TimerMode } from '../core/types';
import { TaskEditor } from '../components/TaskEditor';
import { Background, Button, Card, Chip, Empty, Field, Icon, IconButton, Label, PageHeader, SectionTitle, Segments, Sheet, colors, styles } from '../components/ui';
import { useApp } from '../state/AppProvider';

const filters = { 今天:'today', 即将到来:'upcoming', 已完成:'completed', 全部:'all' } as const;
export default function LifeScreen() {
  const { data, run, toggleTask, removeTask } = useApp();
  const [tab, setTab] = useState('待办'); const [filter, setFilter] = useState<keyof typeof filters>('全部');
  const [query, setQuery] = useState(''); const [showEditor, setShowEditor] = useState(false); const [editing, setEditing] = useState<Task | undefined>();
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const tasks = filterTasks(data.tasks, filters[filter], query);
  const nextTask = nextActionTask(data.tasks);
  const completed = data.tasks.filter((task) => task.completed).length;
  const openNew = () => { setEditing(undefined); setShowEditor(true); };
  return <Background theme={data.settings.theme} type={data.settings.backgroundType} uri={data.settings.backgroundUri}>
    <SafeAreaView edges={['top']} style={styles.fill}><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <PageHeader eyebrow="A LITTLE PROGRESS, EVERY DAY" title="生活，自有节奏" subtitle="一次只做一件事，也是在向前。" action={<IconButton name="add" label="新增任务" onPress={openNew} />} />
      <Segments options={['待办','专注']} value={tab} onChange={setTab} />
      {tab==='待办' ? <>
        <Card style={{backgroundColor:'#DFEADD',marginBottom:14}}><View style={styles.row}><View><Label style={{fontSize:11,color:colors.green,letterSpacing:1}}>YOUR SMALL WINS</Label><Text style={{fontSize:22,fontWeight:'700',color:colors.ink,marginTop:7}}>{completed ? `已经完成 ${completed} 个小目标` : '今天，从一个小目标开始'}</Text><Label muted style={{fontSize:12,marginTop:7}}>{data.tasks.length-completed} 项待完成 · 让行动轻一点</Label></View><Icon name="sparkles-outline" color={colors.green} size={31}/></View></Card>
        {nextTask ? <Card style={{backgroundColor:'rgba(255,255,255,.9)',marginBottom:20,padding:16}}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#F3E3D6'}}><Icon name="flash-outline" color={colors.coral}/></View><View style={{flex:1}}><Label muted style={{fontSize:10,letterSpacing:1}}>NEXT STEP</Label><Text numberOfLines={1} style={{fontSize:15,fontWeight:'700',marginTop:2,color:colors.ink}}>{nextTask.title}</Text><Label muted style={{fontSize:11,marginTop:3}}>{nextTaskTiming(nextTask)}{nextTask.estimatedMinutes ? ` · ${nextTask.estimatedMinutes} 分钟` : ''}</Label></View><Button label="去专注" small variant="soft" onPress={() => {setFocusTaskId(nextTask.id);setTab('专注');}}/></View></Card> : null}
        <View style={[styles.wrap,{marginBottom:16}]}>{(Object.keys(filters) as (keyof typeof filters)[]).map((item) => <Chip key={item} label={item} selected={filter===item} onPress={() => setFilter(item)} />)}</View>
        <View style={[styles.input,{paddingVertical:2,flexDirection:'row',alignItems:'center',gap:8}]}><Icon name="search-outline" color={colors.muted} size={19}/><TextInput accessibilityLabel="搜索任务" placeholder="搜索你的待办" placeholderTextColor="#87978D" value={query} onChangeText={setQuery} style={{flex:1,minHeight:40,fontSize:14,color:colors.ink}} /></View>
        <SectionTitle title="我的待办" detail={`${tasks.length} 项`} />
        {tasks.length===0 ? <Empty title={query?'没有找到这项任务':'给计划一个开始'} detail={filter==='今天' ? '今天没有已安排的任务。可以新增任务，或在“全部”查看未定日期的待办。' : '这里还没有任务。聊天中的灵感也能变成待办。'} action={<Button label="添加一个待办" variant="soft" icon="add" onPress={openNew}/>} /> : tasks.map((task) => <TaskCard key={task.id} task={task} onToggle={() => run(() => toggleTask(task))} onEdit={() => {setEditing(task);setShowEditor(true);}} onDelete={() => run(() => removeTask(task))} />)}
      </> : <FocusPanel suggestedTaskId={focusTaskId} />}
    </ScrollView><TaskEditor visible={showEditor} existing={editing} onClose={() => setShowEditor(false)} /></SafeAreaView>
  </Background>;
}
function TaskCard({task,onToggle,onEdit,onDelete}:{task:Task;onToggle:()=>void;onEdit:()=>void;onDelete:()=>void}) {
  return <Card style={{marginBottom:12,padding:16}}><View style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:task.completed}} accessibilityLabel={`${task.completed?'恢复':'完成'} ${task.title}`} onPress={onToggle} style={{width:25,height:25,borderRadius:9,borderWidth:1.5,borderColor:task.completed?colors.green:'#B9CBC0',backgroundColor:task.completed?colors.green:'transparent',alignItems:'center',justifyContent:'center',marginTop:2}}>{task.completed ? <Icon name="checkmark" color="#fff" size={16}/> : null}</Pressable>
    <View style={{flex:1}}><Pressable accessibilityRole="button" onPress={onEdit}><Label style={{fontSize:15,fontWeight:'600',textDecorationLine:task.completed?'line-through':'none',opacity:task.completed?.55:1}}>{task.title}</Label></Pressable>
      <Label muted style={{fontSize:11,marginTop:5}}>{task.category} · {task.dueDate ?? '未定日期'} {task.dueTime ?? ''}{task.estimatedMinutes ? ` · ${task.estimatedMinutes} 分钟` : ''}{task.isExample ? ' · 示例' : ''}</Label>
      {task.description ? <Label muted style={{fontSize:12,marginTop:5}}>{task.description}</Label> : null}
      <View style={[styles.wrap,{marginTop:10}]}><Button label="编辑" small variant="ghost" onPress={onEdit}/><Button label="删除" small variant="ghost" onPress={onDelete}/></View>
    </View>
  </View></Card>;
}
function FocusPanel({suggestedTaskId}:{suggestedTaskId:string | null}) {
  const { data, commit, run, toast, confirm } = useApp();
  const [mode, setMode] = useState<TimerMode>('focus'); const [minutes, setMinutes] = useState('25');
  const [taskId, setTaskId] = useState<string | null>(null); const [selector, setSelector] = useState(false); const [, tick] = useState(0);
  const timer=data.timer;
  useEffect(() => { if (!timer && suggestedTaskId) setTaskId(suggestedTaskId); }, [suggestedTaskId, timer]);
  useEffect(() => { const interval=setInterval(() => tick((value)=>value+1), 500); return () => clearInterval(interval); }, []);
  const activeMode=timer?.mode ?? mode; const progress=timer ? getTimerProgress(timer) : null;
  const seconds = progress ? (progress.remainingSeconds ?? progress.elapsedSeconds) : activeMode==='stopwatch' ? 0 : Number(minutes || 25)*60;
  const display=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
  const selectedTask=data.tasks.find((task) => task.id===(timer?.taskId ?? taskId));
  const start = async () => {
    const parsed=Number(minutes); const fresh=createTimer({mode,minutes:activeMode==='stopwatch'?1:parsed,taskId:selectedTask?.id ?? null,category:activeMode==='break'?'休息':selectedTask?.category ?? '学习'});
    await commit((current) => ({...current,timer:fresh}));
  };
  const end = async (interrupted=false) => {
    if (!timer) return;
    if (interrupted && !await confirm('重置计时？','已用时间会作为中断记录保存，然后清空计时。')) return;
    await commit((current) => current.timer ? {...current,focusSessions:[...current.focusSessions,finishTimer(current.timer,new Date(),interrupted)],timer:null}:current);
    toast(interrupted ? '计时已重置，已用时间已保存' : '本次记录已保存，辛苦啦');
  };
  return <><View style={[styles.wrap,{justifyContent:'center',marginTop:3}]}>{([{value:'focus',label:'番茄专注'},{value:'break',label:'短休息'},{value:'stopwatch',label:'自由秒表'}] as const).map((item) => <Chip key={item.value} label={item.label} selected={activeMode===item.value} onPress={() => {if(timer){toast('请先结束当前计时，再切换模式');return;}setMode(item.value);setMinutes(item.value==='break'?'5':'25');}} />)}</View>
    <View style={{alignItems:'center',paddingVertical:27}}><View style={{height:260,width:260,borderRadius:130,borderWidth:1,borderColor:'#D2E1D0',padding:13}}><View style={{flex:1,borderRadius:120,borderWidth:5,borderColor:timer?.status==='running'?'#80AF95':'#D4E2D2',backgroundColor:'rgba(255,255,255,.55)',alignItems:'center',justifyContent:'center'}}><Icon name={activeMode==='break'?'cafe-outline':'leaf-outline'} color={colors.green} size={27}/><Text style={{fontSize:48,letterSpacing:1,color:colors.ink,fontWeight:'300',fontVariant:['tabular-nums'],marginVertical:11}}>{display}</Text><Label muted style={{fontSize:12}}>{timer ? timer.status==='paused'?'暂停一下，也没关系':'把注意力留在这一刻' : '准备好，就从现在开始'}</Label></View></View></View>
    <Pressable accessibilityRole="button" accessibilityLabel="选择关联待办" onPress={() => {if(timer)toast('本次任务已锁定，可结束后重新选择');else setSelector(true);}}><Card style={{padding:15}}><View style={styles.row}><Icon name="checkbox-outline" color={colors.green}/><View style={{flex:1}}><Label muted style={{fontSize:10}}>本次专注</Label><Label style={{fontSize:14,fontWeight:'600'}}>{selectedTask?.title ?? '自由专注 · 不关联任务'}</Label></View><Icon name="chevron-forward" size={17}/></View></Card></Pressable>
    {!timer && activeMode!=='stopwatch' ? <View style={{marginTop:20}}><Field label="自定义时长（1–480 分钟）" keyboardType="number-pad" value={minutes} onChangeText={setMinutes}/></View> : null}
    <View style={{marginTop:22,gap:10}}>{!timer ? <Button label={activeMode==='break'?'开始休息':'开始专注'} icon="play" onPress={() => run(start)}/> : <><Button label={timer.status==='running'?'暂停':'继续专注'} icon={timer.status==='running'?'pause':'play'} onPress={() => run(() => commit((current) => ({...current,timer:current.timer ? current.timer.status==='running' ? pauseTimer(current.timer) : resumeTimer(current.timer) : null})))}/><View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}><Button label="结束并保存" variant="soft" icon="checkmark" onPress={() => run(() => end())}/></View><Button label="重置" variant="ghost" onPress={() => run(() => end(true))}/></View></>}</View>
    <Label muted style={{textAlign:'center',fontSize:11,marginTop:17}}>提前结束也会保存 · 切换页面和进入后台不影响计时</Label>
    <SectionTitle title="最近的专注" detail="每一步都算数" />
    {data.focusSessions.length ? data.focusSessions.slice(-4).reverse().map((session) => <Card key={session.id} style={{marginBottom:10,padding:14}}><View style={styles.row}><View><Label>{session.mode==='break'?'短休息':data.tasks.find((task)=>task.id===session.taskId)?.title ?? '自由专注'}</Label><Label muted style={{fontSize:11}}>{new Date(session.startedAt).toLocaleString('zh-CN')} · {session.status==='completed'?'正常完成':'提前结束'}</Label></View><Label style={{fontWeight:'700'}}>{Math.floor(session.actualSeconds/60)}分{session.actualSeconds%60}秒</Label></View></Card>) : <Label muted style={{textAlign:'center',fontSize:12,padding:15}}>第一段专注，正在等你开始。</Label>}
    <Sheet visible={selector} title="选择本次专注的待办" onClose={() => setSelector(false)}><Button label="自由专注 · 不关联任务" variant="soft" onPress={() => {setTaskId(null);setSelector(false);}}/>{data.tasks.filter((task)=>!task.completed).map((task) => <View key={task.id} style={{marginTop:10}}><Button label={task.title} variant="ghost" onPress={() => {setTaskId(task.id);setSelector(false);}}/></View>)}</Sheet>
  </>;
}



function nextActionTask(tasks:Task[]):Task | null {
  const pending=tasks.filter((task)=>!task.completed);
  if (!pending.length) return null;
  return [...pending].sort((left,right)=>nextTaskDeadline(left)-nextTaskDeadline(right))[0] ?? null;
}
function nextTaskDeadline(task:Task):number {
  if (task.dueAt) { const time=new Date(task.dueAt).getTime(); if (Number.isFinite(time)) return time; }
  if (task.dueDate) { const time=new Date(`${task.dueDate}T${task.dueTime ?? '23:59'}:00`).getTime(); if (Number.isFinite(time)) return time; }
  return Number.MAX_SAFE_INTEGER;
}
function nextTaskTiming(task:Task):string {
  if (!task.dueDate) return '还没有安排日期';
  const today=new Date().toISOString().slice(0,10);
  const time=task.dueTime ? ` ${task.dueTime}` : '';
  if (task.dueDate<today) return `已逾期 · ${task.dueDate}${time}`;
  if (task.dueDate===today) return `今天${time}`;
  return `${task.dueDate}${time}`;
}