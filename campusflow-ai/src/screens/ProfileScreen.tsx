import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exportJson, pickImage } from '../services/device';
import { Background, Button, Card, Chip, Icon, IconButton, Label, Notice, PageHeader, SectionTitle, Sheet, styles, type IconName } from '../components/ui';
import { useApp } from '../state/AppProvider';

const REMINDER_TIMES = ['08:00', '12:30', '20:00'] as const;

export default function ProfileScreen() {
  const { data, updateSettings, setNotificationsEnabled, configurePersonaNotification, sendPersonaNotificationTest, confirm, resetAll, run, toast }=useApp();
  const [about,setAbout]=useState(false);
  const [privacy,setPrivacy]=useState(false);
  const [personaReminder,setPersonaReminder]=useState(false);
  const currentPersona = data.personas.find((item) => item.id === data.settings.selectedPersonaId) ?? data.personas[0] ?? null;
  const reminderPersona = data.personas.find((item) => item.id === data.settings.personaNotificationPersonaId) ?? currentPersona;
  const personaReminderActive = data.settings.notificationsEnabled && data.settings.personaNotificationsEnabled;
  const personaReminderDetail = personaReminderActive
    ? `${reminderPersona?.name ?? 'AI 人设'} · 每天 ${data.settings.personaNotificationTime}`
    : data.settings.personaNotificationsEnabled ? '已设定，等待手机提醒总开关开启' : '未开启';

  const chooseBackground=async()=>{const uri=await pickImage();if(uri)await updateSettings({backgroundType:'image',backgroundUri:uri});};
  const notification=async()=>{
    const enabled=!data.settings.notificationsEnabled;
    await setNotificationsEnabled(enabled);
    toast(enabled ? '手机提醒总开关已开启' : '手机提醒总开关已关闭');
  };
  const chooseReminderPersona=async(personaId:string)=>{
    if (personaReminderActive) {
      await configurePersonaNotification({ enabled:true, personaId, time:data.settings.personaNotificationTime });
    } else {
      await updateSettings({ personaNotificationPersonaId:personaId });
    }
  };
  const chooseReminderTime=async(time:string)=>{
    if (personaReminderActive) {
      await configurePersonaNotification({ enabled:true, personaId:reminderPersona?.id, time });
    } else {
      await updateSettings({ personaNotificationTime:time });
    }
  };
  const togglePersonaReminder=async()=>{
    const enabled=!data.settings.personaNotificationsEnabled;
    await configurePersonaNotification({ enabled, personaId:reminderPersona?.id, time:data.settings.personaNotificationTime });
    toast(enabled ? `已开启 ${reminderPersona?.name ?? 'AI 人设'} 的每日消息提醒` : '已关闭角色消息提醒');
  };
  const previewPersonaReminder=async()=>{
    await sendPersonaNotificationTest(reminderPersona?.id);
    toast(`已发送 ${reminderPersona?.name ?? 'AI 人设'} 的测试消息`);
  };
  const exportData=async()=>{await exportJson(`campusflow-data-${new Date().toISOString().slice(0,10)}.json`,data);toast('数据已导出');};
  const clear=async()=>{if(!await confirm('删除全部本地数据？','人设、聊天、待办和专注统计会从这台设备删除，此操作无法撤销。'))return;await resetAll();};

  return <Background theme={data.settings.theme} type={data.settings.backgroundType} uri={data.settings.backgroundUri}><SafeAreaView edges={['top']} style={styles.fill}><ScrollView contentContainerStyle={styles.page}>
    <PageHeader eyebrow="YOUR SPACE, YOUR RULES" title="我的空间" subtitle="数据默认只保存在这台设备上。" />
    <Card><View style={{flexDirection:'row',gap:13,alignItems:'center'}}><View style={{width:48,height:48,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'#DCEBDD'}}><Icon name="sparkles-outline" size={25} color="#28755F"/></View><View style={{flex:1}}><Label style={{fontWeight:'700'}}>CampusFlow AI</Label><Label muted style={{fontSize:12}}>面向大学生的 AI 生活与学习执行助手</Label></View></View></Card>
    <SectionTitle title="AI 与人设" /><Setting icon="people-outline" title="AI 人设管理" detail={`${data.personas.length} 个角色 · 独立对话记录`} onPress={()=>router.push('/personas')} /><Setting icon="chatbubble-ellipses-outline" title="AI 模式" detail={data.settings.aiMode==='mock'?'Mock 演示模式 · 不联网':'真实 API 模式 · 经服务端代理'} onPress={()=>void updateSettings({aiMode:data.settings.aiMode==='mock'?'api':'mock'})} />
    {data.settings.aiMode==='api'?<Notice>真实模式读取 EXPO_PUBLIC_API_BASE_URL，并经 Node 服务端代理请求；不要把 API Key 填进 App。</Notice>:null}
    <SectionTitle title="提醒与外观" /><Setting icon="notifications-outline" title="手机提醒总开关" detail={data.settings.notificationsEnabled?'已开启 · 任务与角色消息可提醒':'未开启'} onPress={()=>run(notification)} /><Setting icon="chatbubble-outline" title="人设消息提醒" detail={personaReminderDetail} onPress={()=>setPersonaReminder(true)} />
    <View style={{marginTop:12}}><Label muted style={{fontSize:12,marginBottom:8}}>主题颜色</Label><View style={styles.wrap}>{([{id:'mint',name:'薄荷'},{id:'lavender',name:'薰衣草'},{id:'peach',name:'暖桃'}] as const).map((item)=><Chip key={item.id} label={item.name} selected={data.settings.theme===item.id} onPress={()=>void updateSettings({theme:item.id})}/>)}</View></View><View style={{marginTop:18}}><Label muted style={{fontSize:12,marginBottom:8}}>背景</Label><View style={styles.wrap}><Chip label="渐变" selected={data.settings.backgroundType==='gradient'} onPress={()=>void updateSettings({backgroundType:'gradient',backgroundUri:null})}/><Chip label="纯色" selected={data.settings.backgroundType==='solid'} onPress={()=>void updateSettings({backgroundType:'solid',backgroundUri:null})}/><Chip label="选择图片" selected={data.settings.backgroundType==='image'} onPress={()=>run(chooseBackground)}/></View></View>
    <SectionTitle title="数据与隐私" /><Setting icon="download-outline" title="导出我的数据" detail="导出为 JSON 文件，可自行保存" onPress={()=>run(exportData)} /><Setting icon="shield-checkmark-outline" title="隐私说明" detail="本地保存，按需发送给 AI 服务商" onPress={()=>setPrivacy(true)} /><Setting icon="trash-outline" title="清除本地数据" detail="不可撤销" destructive onPress={()=>run(clear)} />
    <SectionTitle title="项目" /><Setting icon="information-circle-outline" title="关于 CampusFlow AI" detail="V1 · © 2026 Celia · 保留所有权利" onPress={()=>setAbout(true)} /><Label muted style={{fontSize:11,textAlign:'center',marginTop:4,marginBottom:8}}>© 2026 Celia · 保留所有权利</Label>
  </ScrollView>
  <Sheet visible={personaReminder} title="人设消息提醒" onClose={()=>setPersonaReminder(false)}>
    <Notice>这是一条由手机本地定时显示的提醒，不会在后台实时调用 AI 或发送真实对话。锁屏时可能显示角色名和消息内容。</Notice>
    {!data.personas.length ? <Notice error>请先创建一位 AI 人设，再设置角色消息提醒。</Notice> : <><Label muted style={{fontSize:12,marginTop:12,marginBottom:8}}>以哪位角色的名义提醒</Label><View style={[styles.wrap,{marginBottom:18}]}>{data.personas.map((persona)=><Chip key={persona.id} label={persona.id===data.settings.selectedPersonaId?`当前：${persona.name}`:persona.name} selected={reminderPersona?.id===persona.id} onPress={()=>run(()=>chooseReminderPersona(persona.id))}/>)}</View><Label muted style={{fontSize:12,marginBottom:8}}>每天发送时间</Label><View style={[styles.wrap,{marginBottom:18}]}>{REMINDER_TIMES.map((time)=><Chip key={time} label={time} selected={data.settings.personaNotificationTime===time} onPress={()=>run(()=>chooseReminderTime(time))}/>)}</View><Button label={data.settings.personaNotificationsEnabled?'关闭角色消息提醒':'开启角色消息提醒'} icon={data.settings.personaNotificationsEnabled?'notifications-off-outline':'notifications-outline'} variant={data.settings.personaNotificationsEnabled?'soft':'primary'} onPress={()=>run(togglePersonaReminder)}/><View style={{marginTop:10}}><Button label="发送一条测试消息" icon="send-outline" variant="ghost" onPress={()=>run(previewPersonaReminder)}/></View><Label muted style={{fontSize:11,marginTop:12}}>开启时会请求安卓通知权限。系统省电策略或你的系统通知设置可能延后或静音提醒。</Label></>}
  </Sheet>
  <Sheet visible={privacy} title="隐私说明" onClose={()=>setPrivacy(false)}><Label muted>聊天、人设、待办和专注记录默认存储在设备本地。只有你主动切换至真实 API 模式并发送消息时，当前人设偏好和对话内容才会发送到你自行部署的 AI 代理；API Key 只应放在服务端环境变量中。</Label><Notice>不读取通讯录、定位、相册或健康数据。选择头像或背景时才请求相册权限；开启任务或人设消息提醒时才请求通知权限。</Notice></Sheet><Sheet visible={about} title="关于项目" onClose={()=>setAbout(false)}><Label muted>CampusFlow AI 是一款可继续开发的 React Native / Expo 项目。它帮助大学生把对话中的计划变成待办，再通过专注计时和统计看见自己的节奏。</Label><Label muted style={{fontSize:12,marginTop:14}}>版权所有：© 2026 Celia · 保留所有权利。</Label><Notice>AI 是工具，不是现实关系的替代；内容由 AI 生成，请自行判断。</Notice></Sheet></SafeAreaView></Background>;
}
function Setting({icon,title,detail,onPress,destructive=false}:{icon:IconName;title:string;detail:string;onPress:()=>void;destructive?:boolean}){return <Card style={{padding:15,marginBottom:10}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:destructive?'#F8EAE7':'#EAF1E8'}}><Icon name={icon} color={destructive?'#AD4646':'#28755F'}/></View><View style={{flex:1}}><Label style={{fontSize:14,fontWeight:'600',color:destructive?'#AD4646':undefined}}>{title}</Label><Label muted style={{fontSize:11}}>{detail}</Label></View><IconButton name="chevron-forward" label={title} onPress={onPress}/></View></Card>;}
