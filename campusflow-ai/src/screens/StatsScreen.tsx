import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStatistics, makeId } from '../core';
import type { FocusSession, StatisticsPeriod, Task } from '../core/types';
import { Background, Button, Card, Empty, Label, PageHeader, SectionTitle, Segments, colors, styles } from '../components/ui';
import { useApp } from '../state/AppProvider';

export default function StatsScreen() {
  const { data, commit, run, toast } = useApp();
  const [period, setPeriod] = useStatePeriod('week');
  const statistics=getStatistics(data,period);
  const hasData=data.focusSessions.some((item)=>item.mode!=='break') || data.tasks.some((item)=>item.completed);
  const loadExample=async()=>{
    const now=new Date(); const tasks:Task[]=[];const sessions:FocusSession[]=[];
    for(let index=0;index<7;index+=1){const date=new Date(now);date.setDate(date.getDate()-index);date.setHours(18,0,0,0);if(index===3)continue;
      const task:Task={id:makeId('sample-task'),title:['复习线性代数','整理课程笔记','英语阅读','完成实验报告'][index%4]!,description:'这是用户主动加载的示例数据。',category:index%3===0?'阅读':'学习',dueDate:null,dueTime:null,dueAt:null,estimatedMinutes:25,completed:true,completedAt:date.toISOString(),sourceMessageId:null,personaId:data.settings.selectedPersonaId,createdAt:date.toISOString(),updatedAt:date.toISOString(),notificationId:null,isExample:true};tasks.push(task);
      sessions.push({id:makeId('sample-focus'),taskId:task.id,category:task.category,plannedMinutes:25,actualSeconds:(index%3+1)*25*60,status:'completed',mode:'focus',startedAt:new Date(date.getTime()-(index%3+1)*25*60_000).toISOString(),endedAt:date.toISOString(),isExample:true});
    }
    await commit((current)=>({...current,tasks:[...current.tasks,...tasks],focusSessions:[...current.focusSessions,...sessions]}));toast('已加载示例数据，可在“我的”中清除。');
  };
  return <Background theme={data.settings.theme} type={data.settings.backgroundType} uri={data.settings.backgroundUri}><SafeAreaView edges={['top']} style={styles.fill}><ScrollView contentContainerStyle={styles.page}>
    <PageHeader eyebrow="MAKE YOUR RHYTHM VISIBLE" title="看见你的节奏" subtitle="统计只来自保存在这台设备上的真实记录。" />
    <Segments options={['每日','每周','每月']} value={period==='day'?'每日':period==='week'?'每周':'每月'} onChange={(value)=>setPeriod(value==='每日'?'day':value==='每周'?'week':'month')}/>
    {!hasData?<Empty icon="stats-chart-outline" title="还没有统计记录" detail="完成一项待办、发送一条消息或保存一次专注后，这里会显示真实数据。示例数据只在你主动点击后加入。"
      action={<Button label="加载示例数据" variant="soft" icon="sparkles-outline" onPress={()=>run(loadExample)}/>} />:<>
      <View style={{flexDirection:'row',gap:12}}><Metric label="今日专注" value={formatMinutes(statistics.todayFocusMinutes)} note="不含休息时间"/><Metric label="今日完成" value={String(statistics.todayCompletedTasks)} note="个待办"/></View>
      <View style={{flexDirection:'row',gap:12,marginTop:12}}><Metric label="连续使用" value={String(statistics.streak)} note="天"/><Metric label="本周期完成" value={String(statistics.completedTasks)} note="个待办"/></View>
      <SectionTitle title="专注趋势" detail={period==='day'?'今天':period==='week'?'本周':'本月'} /><Trend rows={statistics.trend} />
      <Card style={{marginTop:12,padding:15}}><View style={styles.row}><View><Label muted style={{fontSize:11}}>最近 7 天 vs 前 7 天</Label><Label style={{fontSize:18,fontWeight:'700',marginTop:4}}>{formatMinutes(statistics.recent7Minutes)}</Label></View><Label style={{fontWeight:'700',color:statistics.changePercent===null?colors.muted:statistics.changePercent>=0?colors.green:colors.coral}}>{statistics.changePercent===null?'暂无可比较数据':`${statistics.changePercent>=0?'+':''}${Math.round(statistics.changePercent)}%`}</Label></View></Card>
      <SectionTitle title="任务完成" detail={`${statistics.completedTasks} 项`} /><CompletionTrend rows={statistics.trend}/>
      <SectionTitle title="近 35 天热力图" detail="专注 + 完成任务" /><Heatmap rows={statistics.heatmap}/>
      <SectionTitle title="专注分类" detail="不含休息" /><Category rows={statistics.categoryMinutes}/>
    </>}
  </ScrollView></SafeAreaView></Background>;
}
function useStatePeriod(defaultValue:StatisticsPeriod):[StatisticsPeriod,(value:StatisticsPeriod)=>void] {
  return useState<StatisticsPeriod>(defaultValue);
}
function Metric({label,value,note}:{label:string;value:string;note:string}) {return <Card style={{flex:1,padding:16}}><Label muted style={{fontSize:11}}>{label}</Label><Text style={{fontSize:27,fontWeight:'700',color:colors.ink,marginTop:6}}>{value}</Text><Label muted style={{fontSize:11}}>{note}</Label></Card>;}
function formatMinutes(value:number){const rounded=Math.floor(value);return rounded>=60?`${Math.floor(rounded/60)}h ${rounded%60}m`:`${rounded} 分钟`;}
function Trend({rows}:{rows:{date:string;focusMinutes:number}[]}) {
  const maximum=Math.max(...rows.map((row)=>row.focusMinutes),1);
  return <Card style={{padding:16}}><View style={{height:138,flexDirection:'row',alignItems:'flex-end',gap:4}}>{rows.map((row)=>{const height=Math.max(row.focusMinutes?13:4,Math.min(118,row.focusMinutes/maximum*118));return <View key={row.date} style={{flex:1,alignItems:'center',gap:6}}><View style={{height,width:'100%',maxWidth:24,borderRadius:8,backgroundColor:row.focusMinutes?'#78A98C':'#E3E8E0'}}/><Label muted style={{fontSize:9}}>{row.date.slice(5).replace('-','/')}</Label></View>;})}</View><Label muted style={{fontSize:11,marginTop:9}}>合计 {formatMinutes(rows.reduce((sum,row)=>sum+row.focusMinutes,0))}</Label></Card>;
}
function CompletionTrend({rows}:{rows:{date:string;completedTasks:number}[]}){return <Card style={{padding:16,gap:10}}>{rows.map((row)=><View key={row.date} style={{flexDirection:'row',alignItems:'center',gap:10}}><Label muted style={{fontSize:11,width:42}}>{row.date.slice(5)}</Label><View style={{height:8,flex:1,borderRadius:6,backgroundColor:'#E4EAE1'}}><View style={{height:8,width:`${Math.min(100,row.completedTasks*25)}%`,borderRadius:6,backgroundColor:colors.green}}/></View><Label style={{fontSize:12,width:20,textAlign:'right'}}>{row.completedTasks}</Label></View>)}</Card>;}
function Heatmap({rows}:{rows:{date:string;focusMinutes:number;completedTasks:number}[]}) {return <Card style={{padding:15}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{rows.map((row)=>{const score=row.focusMinutes+row.completedTasks*25;const color=score===0?'#EDF0EA':score<25?'#DDEBD9':score<60?'#AAD0B1':'#5B9973';return <View key={row.date} accessibilityLabel={`${row.date}，专注 ${Math.floor(row.focusMinutes)} 分钟，完成 ${row.completedTasks} 项`} style={{width:'12.1%',aspectRatio:1,borderRadius:7,backgroundColor:color}}/>;})}</View><Label muted style={{fontSize:11,marginTop:11}}>浅色表示较少活动；颜色越深，记录越多。</Label></Card>;}
function Category({rows}:{rows:Record<string,number>}){const total=Object.values(rows).reduce((sum,value)=>sum+value,0);return <Card style={{padding:16,gap:12}}>{Object.entries(rows).filter(([,value])=>value>0).map(([category,value])=><View key={category} style={{flexDirection:'row',alignItems:'center',gap:10}}><Label style={{width:34,fontSize:12}}>{category}</Label><View style={{height:9,flex:1,borderRadius:8,backgroundColor:'#E5EAE2'}}><View style={{height:9,width:`${total?value/total*100:0}%`,borderRadius:8,backgroundColor:colors.green}}/></View><Label muted style={{fontSize:11,width:48,textAlign:'right'}}>{formatMinutes(value)}</Label></View>)}{total===0?<Label muted>本周期还没有专注分类记录。</Label>:null}</Card>;}

