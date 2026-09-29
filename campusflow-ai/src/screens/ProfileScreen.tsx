import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { focusGuardScopeKey } from '../core';
import type { FocusGuardApp, FocusGuardMode } from '../core/types';
import { exportJson, pickImage } from '../services/device';
import {
  getFocusGuardLauncherApps,
  getFocusGuardStatus,
  getFocusGuardUsageSummary,
  openFocusGuardAccessibilitySettings,
  openFocusGuardUsageAccessSettings,
  pauseFocusGuardForFiveMinutes,
  recordFocusGuardConsent,
  resetFocusGuardConsent,
  type FocusGuardNativeApp,
  type FocusGuardRuntimeStatus,
  type FocusGuardUsageEntry,
} from '../services/focusGuard';
import { Background, Button, Card, Chip, Icon, IconButton, Label, Notice, PageHeader, SectionTitle, Sheet, styles, type IconName } from '../components/ui';
import { useApp } from '../state/AppProvider';

const REMINDER_TIMES = ['08:00', '12:30', '17:30', '20:00'] as const;
const TONES = [
  { id:'warm', label:'温柔陪伴' },
  { id:'direct', label:'直接行动' },
  { id:'light', label:'轻松问候' },
] as const;
const QUIET_PRESETS = [
  { id:'off', label:'不设免打扰', enabled:false, start:'22:30', end:'07:30' },
  { id:'night', label:'22:30–07:30', enabled:true, start:'22:30', end:'07:30' },
  { id:'late', label:'23:30–08:00', enabled:true, start:'23:30', end:'08:00' },
  { id:'morning', label:'00:00–08:00', enabled:true, start:'00:00', end:'08:00' },
] as const;
const toneLabel = { warm:'温柔陪伴', direct:'直接行动', light:'轻松问候' } as const;

export default function ProfileScreen() {
  const { data, updateSettings, setNotificationsEnabled, configurePersonaNotification, sendPersonaNotificationTest, confirm, resetAll, run, toast }=useApp();
  const [about,setAbout]=useState(false);
  const [privacy,setPrivacy]=useState(false);
  const [personaReminder,setPersonaReminder]=useState(false);
  const [focusGuard,setFocusGuard]=useState(false);
  const [focusGuardStep,setFocusGuardStep]=useState<'overview'|'apps'>('overview');
  const [focusGuardStatus,setFocusGuardStatus]=useState<FocusGuardRuntimeStatus | null>(null);
  const [availableGuardApps,setAvailableGuardApps]=useState<FocusGuardNativeApp[]>([]);
  const [draftGuardApps,setDraftGuardApps]=useState<FocusGuardApp[]>([]);
  const [usageEntries,setUsageEntries]=useState<FocusGuardUsageEntry[]>([]);
  const [guardRefreshing,setGuardRefreshing]=useState(false);

  const currentPersona = data.personas.find((item) => item.id === data.settings.selectedPersonaId) ?? data.personas[0] ?? null;
  const reminderPersona = data.personas.find((item) => item.id === data.settings.personaNotificationPersonaId) ?? currentPersona;
  const reminderTimes = [...new Set(data.settings.personaNotificationTimes?.length ? data.settings.personaNotificationTimes : [data.settings.personaNotificationTime])].sort();
  const reminderTone = data.settings.personaNotificationTone;
  const personaReminderActive = data.settings.notificationsEnabled && data.settings.personaNotificationsEnabled;
  const quietDetail = data.settings.personaQuietHoursEnabled ? ' · ' + data.settings.personaQuietHoursStart + '–' + data.settings.personaQuietHoursEnd + ' 静音' : '';
  const personaReminderDetail = personaReminderActive
    ? (reminderPersona?.name ?? 'AI 人设') + ' · ' + reminderTimes.join('、') + ' · ' + toneLabel[reminderTone] + quietDetail
    : data.settings.personaNotificationsEnabled ? '节奏已设定，等待手机提醒总开关开启' : '未开启';

  const guardScope = focusGuardScopeKey(data.settings.focusGuardMode, data.settings.focusGuardSelectedApps);
  const guardConsent = data.settings.focusGuardConsent;
  const guardDoubleConfirmed = Boolean(guardConsent?.secondConfirmedAt && guardConsent.scopeKey === guardScope);
  const guardSelectionNames = data.settings.focusGuardSelectedApps.map((app) => app.label);
  const guardDetail = data.settings.focusGuardSelectedApps.length === 0
    ? '未选择应用 · 默认不会读取或守护其他应用'
    : data.settings.focusGuardEnabled
      ? '已选 ' + data.settings.focusGuardSelectedApps.length + ' 个应用 · 仅番茄专注时生效'
      : guardDoubleConfirmed
        ? '已选 ' + data.settings.focusGuardSelectedApps.length + ' 个应用 · 已完成双重确认'
        : '已选 ' + data.settings.focusGuardSelectedApps.length + ' 个应用 · 待双重确认';

  const chooseBackground=async()=>{const uri=await pickImage();if(uri)await updateSettings({backgroundType:'image',backgroundUri:uri});};
  const notification=async()=>{
    const enabled=!data.settings.notificationsEnabled;
    await setNotificationsEnabled(enabled);
    toast(enabled ? '手机提醒总开关已开启' : '手机提醒总开关已关闭');
  };
  const saveRhythm=async(options:{ personaId?:string | null; times?:string[]; tone?:typeof reminderTone; quietEnabled?:boolean; quietStart?:string; quietEnd?:string })=>{
    const personaId = options.personaId ?? reminderPersona?.id ?? null;
    const times = [...new Set(options.times ?? reminderTimes)].sort();
    const tone = options.tone ?? reminderTone;
    const quietEnabled = options.quietEnabled ?? data.settings.personaQuietHoursEnabled;
    const quietStart = options.quietStart ?? data.settings.personaQuietHoursStart;
    const quietEnd = options.quietEnd ?? data.settings.personaQuietHoursEnd;
    if (!times.length) { toast('至少保留一个每日消息时间'); return; }
    if (personaReminderActive) {
      await configurePersonaNotification({ enabled:true, personaId, times, tone, quietHoursEnabled:quietEnabled, quietHoursStart:quietStart, quietHoursEnd:quietEnd });
    } else {
      await updateSettings({ personaNotificationPersonaId:personaId, personaNotificationTime:times[0], personaNotificationTimes:times, personaNotificationTone:tone, personaQuietHoursEnabled:quietEnabled, personaQuietHoursStart:quietStart, personaQuietHoursEnd:quietEnd });
    }
  };
  const chooseReminderPersona=async(personaId:string)=>{ await saveRhythm({personaId}); };
  const toggleReminderTime=async(time:string)=>{
    const next = reminderTimes.includes(time) ? reminderTimes.filter((item) => item!==time) : [...reminderTimes,time];
    await saveRhythm({times:next});
  };
  const chooseTone=async(tone:typeof reminderTone)=>{ await saveRhythm({tone}); };
  const chooseQuietPreset=async(preset:(typeof QUIET_PRESETS)[number])=>{ await saveRhythm({quietEnabled:preset.enabled,quietStart:preset.start,quietEnd:preset.end}); };
  const togglePersonaReminder=async()=>{
    const enabled=!data.settings.personaNotificationsEnabled;
    await configurePersonaNotification({ enabled, personaId:reminderPersona?.id, times:reminderTimes, tone:reminderTone, quietHoursEnabled:data.settings.personaQuietHoursEnabled, quietHoursStart:data.settings.personaQuietHoursStart, quietHoursEnd:data.settings.personaQuietHoursEnd });
    toast(enabled ? '已开启 ' + (reminderPersona?.name ?? 'AI 人设') + ' 的陪伴节奏' : '已关闭陪伴节奏');
  };
  const previewPersonaReminder=async()=>{
    await sendPersonaNotificationTest(reminderPersona?.id);
    toast('已发送 ' + (reminderPersona?.name ?? 'AI 人设') + ' 的测试消息');
  };
  const exportData=async()=>{await exportJson('campusflow-data-' + new Date().toISOString().slice(0,10) + '.json',data);toast('数据已导出');};
  const clear=async()=>{if(!await confirm('删除全部本地数据？','人设、聊天、待办和专注统计会从这台设备删除，此操作无法撤销。'))return;await resetAll();};

  const refreshFocusGuard = async () => {
    setGuardRefreshing(true);
    try {
      const status = await getFocusGuardStatus();
      setFocusGuardStatus(status);
      if (!status.supported) {
        setAvailableGuardApps([]);
        setUsageEntries([]);
        return;
      }
      const apps = await getFocusGuardLauncherApps();
      setAvailableGuardApps(apps);
      if (status.usageAccessGranted && guardDoubleConfirmed && data.settings.focusGuardSelectedApps.length) {
        setUsageEntries(await getFocusGuardUsageSummary(
          data.settings.focusGuardSelectedApps.map((app) => app.packageName),
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ));
      } else {
        setUsageEntries([]);
      }
    } finally {
      setGuardRefreshing(false);
    }
  };
  const openFocusGuard = () => {
    setDraftGuardApps(data.settings.focusGuardSelectedApps);
    setFocusGuardStep('overview');
    setFocusGuard(true);
    void refreshFocusGuard().catch((error:unknown) => toast(error instanceof Error ? error.message : '无法读取专注守护状态'));
  };
  const toggleDraftGuardApp = (app:FocusGuardNativeApp) => {
    setDraftGuardApps((current) => current.some((item) => item.packageName===app.packageName)
      ? current.filter((item) => item.packageName!==app.packageName)
      : [...current,{packageName:app.packageName,label:app.label,selectedAt:new Date().toISOString()}]);
  };
  const saveGuardApps = async () => {
    const next = [...draftGuardApps].sort((left,right) => left.packageName.localeCompare(right.packageName));
    const before = data.settings.focusGuardSelectedApps.map((app) => app.packageName).sort().join('|');
    const after = next.map((app) => app.packageName).join('|');
    const changed = before !== after;
    await updateSettings({
      focusGuardSelectedApps:next,
      focusGuardEnabled:changed ? false : data.settings.focusGuardEnabled,
      focusGuardConsent:changed ? null : data.settings.focusGuardConsent,
    });
    if (changed) await resetFocusGuardConsent();
    setUsageEntries([]);
    setFocusGuardStep('overview');
    toast(changed ? '应用范围已保存；请重新完成两次确认。' : '应用范围已更新');
  };
  const chooseGuardMode = async (mode:FocusGuardMode) => {
    if (mode===data.settings.focusGuardMode) return;
    await updateSettings({focusGuardMode:mode,focusGuardEnabled:false,focusGuardConsent:null});
    await resetFocusGuardConsent();
    setUsageEntries([]);
    toast('模式已切换；请重新完成两次确认。');
  };
  const firstGuardConfirmation = async () => {
    if (!data.settings.focusGuardSelectedApps.length) { toast('请先选择至少一个应用。'); return; }
    const names = guardSelectionNames.join('、');
    const action = data.settings.focusGuardMode==='nudge'
      ? '在番茄专注运行时，命中这些应用会被带回手机桌面。'
      : '只显示这些应用近 7 天的本机使用时长。';
    const agreed = await confirm(
      '第一次确认：确认访问范围',
      '你选择了：' + names + '。' + action + '不读取聊天、输入、图片、通知、账号、密码或屏幕内容，也不会上传给 AI 或服务器。'
    );
    if (!agreed) return;
    await updateSettings({
      focusGuardEnabled:false,
      focusGuardConsent:{
        disclosureVersion:1,
        scopeKey:focusGuardScopeKey(data.settings.focusGuardMode,data.settings.focusGuardSelectedApps),
        firstConfirmedAt:new Date().toISOString(),
        secondConfirmedAt:null,
      }
    });
    toast('已完成第一次确认。请继续进行第二次确认，再前往系统设置。');
  };
  const secondGuardConfirmation = async () => {
    const consent = data.settings.focusGuardConsent;
    if (!consent || consent.scopeKey!==guardScope) { toast('请先完成第一次确认。'); return; }
    const agreed = await confirm(
      '第二次确认：前往系统授权',
      '我理解 Android 的“使用情况访问”和“无障碍专注守护”都必须由我亲自在系统设置中开启，随时可以关闭。系统授权不会自动完成。'
    );
    if (!agreed) return;
    await recordFocusGuardConsent();
    await updateSettings({focusGuardConsent:{...consent,secondConfirmedAt:new Date().toISOString()}});
    await openFocusGuardUsageAccessSettings();
    toast('已打开系统设置。开启后回到这里点“刷新授权状态”。');
  };
  const openUsageAccess = async () => {
    if (!guardDoubleConfirmed) { toast('请先完成两次确认。'); return; }
    await openFocusGuardUsageAccessSettings();
  };
  const openAccessibility = async () => {
    if (!guardDoubleConfirmed) { toast('请先完成两次确认。'); return; }
    await openFocusGuardAccessibilitySettings();
  };
  const toggleFocusGuard = async () => {
    if (data.settings.focusGuardMode!=='nudge') { toast('请先选择“专注守护”模式。'); return; }
    if (!guardDoubleConfirmed) { toast('请先完成两次确认。'); return; }
    if (!focusGuardStatus?.accessibilityEnabled) { toast('请先在系统设置开启 CampusFlow 专注守护。'); return; }
    const enabled = !data.settings.focusGuardEnabled;
    await updateSettings({focusGuardEnabled:enabled});
    toast(enabled ? '专注守护已开启；只在正在运行的番茄专注中生效。' : '专注守护已关闭。');
  };
  const pauseNativeGuard = async () => {
    await pauseFocusGuardForFiveMinutes();
    toast('专注守护已暂停 5 分钟。');
    await refreshFocusGuard();
  };

  return <Background theme={data.settings.theme} type={data.settings.backgroundType} uri={data.settings.backgroundUri}><SafeAreaView edges={['top']} style={styles.fill}><ScrollView contentContainerStyle={styles.page}>
    <PageHeader eyebrow="YOUR SPACE, YOUR RULES" title="我的空间" subtitle="数据默认只保存在这台设备上。" />
    <Card><View style={{flexDirection:'row',gap:13,alignItems:'center'}}><View style={{width:48,height:48,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'#DCEBDD'}}><Icon name="sparkles-outline" size={25} color="#28755F"/></View><View style={{flex:1}}><Label style={{fontWeight:'700'}}>CampusFlow AI</Label><Label muted style={{fontSize:12}}>面向大学生的 AI 生活与学习执行助手</Label></View></View></Card>
    <SectionTitle title="AI 与人设" /><Setting icon="people-outline" title="AI 人设管理" detail={String(data.personas.length) + ' 个角色 · 独立对话记录'} onPress={()=>router.push('/personas')} /><Setting icon="chatbubble-ellipses-outline" title="AI 模式" detail={data.settings.aiMode==='mock'?'Mock 演示模式 · 不联网':'真实 API 模式 · 经服务端代理'} onPress={()=>void updateSettings({aiMode:data.settings.aiMode==='mock'?'api':'mock'})} />
    {data.settings.aiMode==='api'?<Notice>真实模式由服务器调用已配置的 AI，密钥不会放入 App。若接入 Gemini 免费层，Google 可能使用对话内容改进产品，请勿输入敏感隐私。</Notice>:null}
    <SectionTitle title="提醒与陪伴" /><Setting icon="notifications-outline" title="手机提醒总开关" detail={data.settings.notificationsEnabled?'已开启 · 任务与角色消息可提醒':'未开启'} onPress={()=>run(notification)} /><Setting icon="heart-outline" title="陪伴节奏" detail={personaReminderDetail} onPress={()=>setPersonaReminder(true)} />
    <SectionTitle title="专注与应用访问" /><Setting icon="shield-checkmark-outline" title="应用访问与专注守护" detail={guardDetail} onPress={openFocusGuard} />
    <View style={{marginTop:12}}><Label muted style={{fontSize:12,marginBottom:8}}>主题颜色</Label><View style={styles.wrap}>{([{id:'mint',name:'薄荷'},{id:'lavender',name:'薰衣草'},{id:'peach',name:'暖桃'}] as const).map((item)=><Chip key={item.id} label={item.name} selected={data.settings.theme===item.id} onPress={()=>void updateSettings({theme:item.id})}/>)}</View></View><View style={{marginTop:18}}><Label muted style={{fontSize:12,marginBottom:8}}>背景</Label><View style={styles.wrap}><Chip label="渐变" selected={data.settings.backgroundType==='gradient'} onPress={()=>void updateSettings({backgroundType:'gradient',backgroundUri:null})}/><Chip label="纯色" selected={data.settings.backgroundType==='solid'} onPress={()=>void updateSettings({backgroundType:'solid',backgroundUri:null})}/><Chip label="选择图片" selected={data.settings.backgroundType==='image'} onPress={()=>run(chooseBackground)}/></View></View>
    <SectionTitle title="数据与隐私" /><Setting icon="download-outline" title="导出我的数据" detail="导出为 JSON 文件，可自行保存" onPress={()=>run(exportData)} /><Setting icon="shield-checkmark-outline" title="隐私说明" detail="默认本地保存，按需向 AI 发送内容" onPress={()=>setPrivacy(true)} /><Setting icon="trash-outline" title="清除本地数据" detail="不可撤销" destructive onPress={()=>run(clear)} />
    <SectionTitle title="项目" /><Setting icon="information-circle-outline" title="关于 CampusFlow AI" detail="V1 · © 2026 Celia · 保留所有权利" onPress={()=>setAbout(true)} /><Label muted style={{fontSize:11,textAlign:'center',marginTop:4,marginBottom:8}}>© 2026 Celia · 保留所有权利</Label>
  </ScrollView>
  <Sheet visible={personaReminder} title="陪伴节奏" onClose={()=>setPersonaReminder(false)}>
    <Notice>所有消息都是手机本地定时提醒，不会在后台实时调用 AI。你可以决定发送时段、语气和免打扰时间，也可以随时关闭。</Notice>
    {!data.personas.length ? <Notice error>请先创建一位 AI 人设，再设置陪伴节奏。</Notice> : <>
      <Label muted style={{fontSize:12,marginTop:12,marginBottom:8}}>以哪位角色的名义提醒</Label><View style={[styles.wrap,{marginBottom:18}]}>{data.personas.map((persona)=><Chip key={persona.id} label={persona.id===data.settings.selectedPersonaId?'当前：' + persona.name:persona.name} selected={reminderPersona?.id===persona.id} onPress={()=>run(()=>chooseReminderPersona(persona.id))}/>)}</View>
      <Label muted style={{fontSize:12,marginBottom:8}}>每天什么时候发来消息</Label><View style={styles.wrap}>{REMINDER_TIMES.map((time)=><Chip key={time} label={time} selected={reminderTimes.includes(time)} onPress={()=>run(()=>toggleReminderTime(time))}/>)}</View><Label muted style={{fontSize:11,marginTop:8,marginBottom:18}}>可多选，当前已选 {reminderTimes.length} 个时段。</Label>
      <Label muted style={{fontSize:12,marginBottom:8}}>消息语气</Label><View style={[styles.wrap,{marginBottom:18}]}>{TONES.map((tone)=><Chip key={tone.id} label={tone.label} selected={reminderTone===tone.id} onPress={()=>run(()=>chooseTone(tone.id))}/>)}</View>
      <Label muted style={{fontSize:12,marginBottom:8}}>免打扰时段</Label><View style={[styles.wrap,{marginBottom:14}]}>{QUIET_PRESETS.map((preset)=>{const selected=preset.enabled===data.settings.personaQuietHoursEnabled && (!preset.enabled || (preset.start===data.settings.personaQuietHoursStart && preset.end===data.settings.personaQuietHoursEnd));return <Chip key={preset.id} label={preset.label} selected={selected} onPress={()=>run(()=>chooseQuietPreset(preset))}/>;})}</View>
      {data.settings.personaQuietHoursEnabled ? <Notice>免打扰期间不会安排角色消息；若所有已选时段都落在其中，开启时会提示你调整。</Notice> : null}
      <Button label={data.settings.personaNotificationsEnabled?'关闭陪伴节奏':'开启陪伴节奏'} icon={data.settings.personaNotificationsEnabled?'notifications-off-outline':'heart-outline'} variant={data.settings.personaNotificationsEnabled?'soft':'primary'} onPress={()=>run(togglePersonaReminder)}/><View style={{marginTop:10}}><Button label="发送一条测试消息" icon="send-outline" variant="ghost" onPress={()=>run(previewPersonaReminder)}/></View><Label muted style={{fontSize:11,marginTop:12}}>开启时会请求安卓通知权限。系统省电策略或你的系统通知设置可能延后或静音提醒。</Label>
    </>}
  </Sheet>
  <Sheet visible={focusGuard} title={focusGuardStep==='apps'?'选择要管理的应用':'应用访问与专注守护'} onClose={()=>setFocusGuard(false)}>
    {focusGuardStep==='apps' ? <>
      <Notice>只显示可从桌面启动的非系统应用。选择范围一旦改变，之前的双重确认会失效。</Notice>
      {!focusGuardStatus?.supported ? <Notice error>网页预览和 Expo Go 不支持读取应用列表。请安装包含专注守护的新 Android APK。</Notice> : null}
      <View style={{marginTop:12,marginBottom:10}}><Button label="返回守护设置" variant="ghost" icon="arrow-back" onPress={()=>setFocusGuardStep('overview')}/></View>
      {availableGuardApps.length ? availableGuardApps.map((app)=>{
        const selected=draftGuardApps.some((item)=>item.packageName===app.packageName);
        return <Pressable key={app.packageName} accessibilityRole="checkbox" accessibilityState={{checked:selected}} accessibilityLabel={'选择 ' + app.label} onPress={()=>toggleDraftGuardApp(app)} style={{paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#E2EAE1'}}><View style={{flexDirection:'row',alignItems:'center',gap:11}}><Icon name={selected?'checkmark-circle':'ellipse-outline'} color={selected?'#28755F':'#667870'} size={21}/><View style={{flex:1}}><Label style={{fontWeight:'600'}}>{app.label}</Label><Label muted style={{fontSize:10}}>{app.packageName}</Label></View></View></Pressable>;
      }) : <Label muted style={{textAlign:'center',paddingVertical:22}}>刷新后会显示可选择的应用。</Label>}
      <View style={{marginTop:16}}><Button label={'保存 ' + draftGuardApps.length + ' 个应用'} onPress={()=>run(saveGuardApps)} /></View>
    </> : <>
      <Notice>默认不读取或限制其他应用。只有你选择范围、连续完成两次确认，并亲自在 Android 系统设置开启权限后，功能才会生效。</Notice>
      {!focusGuardStatus?.supported ? <Notice error>当前环境不含 Android 原生模块。需要重新安装新版 APK；网页预览和 Expo Go 不支持此功能。</Notice> : null}
      <View style={{marginTop:8}}><Button label={guardRefreshing?'正在刷新…':'刷新授权状态'} icon="refresh-outline" variant="ghost" disabled={guardRefreshing} onPress={()=>run(refreshFocusGuard)}/></View>
      <SectionTitle title="模式" detail="切换会要求重新确认" />
      <View style={styles.wrap}><Chip label="使用洞察" selected={data.settings.focusGuardMode==='insights'} onPress={()=>run(()=>chooseGuardMode('insights'))}/><Chip label="专注守护" selected={data.settings.focusGuardMode==='nudge'} onPress={()=>run(()=>chooseGuardMode('nudge'))}/></View>
      <Label muted style={{fontSize:11,marginTop:9}}>{data.settings.focusGuardMode==='insights'?'仅显示你选择的应用近 7 天使用时长。':'番茄专注运行时，如打开你选择的应用，Android 会把它带回手机桌面；不会真正卸载、强制停止或冻结应用。'}</Label>
      <SectionTitle title="选择范围" detail={String(data.settings.focusGuardSelectedApps.length) + ' 个应用'} />
      <Card style={{padding:14}}><Label style={{fontWeight:'600'}}>{guardSelectionNames.length ? guardSelectionNames.join('、') : '还没有选择应用'}</Label><Label muted style={{fontSize:11,marginTop:5}}>仅保存应用名称、包名和你的确认记录在本机。</Label><View style={{marginTop:10}}><Button label="选择应用" small variant="soft" icon="apps-outline" onPress={()=>setFocusGuardStep('apps')}/></View></Card>
      <SectionTitle title="双重确认与系统授权" />
      {!guardConsent || guardConsent.scopeKey!==guardScope ? <Button label="第一步：确认访问范围" icon="shield-checkmark-outline" onPress={()=>run(firstGuardConfirmation)} disabled={!data.settings.focusGuardSelectedApps.length} /> : <><Notice>第一次确认已完成：范围为 {guardSelectionNames.join('、')}。</Notice>{!guardDoubleConfirmed ? <View style={{marginTop:10}}><Button label="第二步：确认后前往系统授权" icon="settings-outline" onPress={()=>run(secondGuardConfirmation)}/></View> : <Notice>两次确认已完成。接下来由你在 Android 系统设置中亲自打开所需权限。</Notice>}</>}
      {guardDoubleConfirmed ? <View style={{gap:10,marginTop:12}}>
        <PermissionCard title="使用情况访问" detail="读取所选应用的本机使用时长" enabled={Boolean(focusGuardStatus?.usageAccessGranted)} actionLabel="前往系统授权" onPress={()=>run(openUsageAccess)} />
        {data.settings.focusGuardMode==='nudge' ? <PermissionCard title="专注守护" detail="专注时检测所选应用前台包名并带回桌面" enabled={Boolean(focusGuardStatus?.accessibilityEnabled)} actionLabel="前往系统开启" onPress={()=>run(openAccessibility)} /> : null}
      </View> : null}
      {guardDoubleConfirmed && focusGuardStatus?.usageAccessGranted ? <><SectionTitle title="近 7 天使用时长" detail="仅已选择应用" />{usageEntries.length ? usageEntries.map((entry)=><UsageCard key={entry.packageName} entry={entry}/>) : <Label muted style={{fontSize:12,paddingVertical:7}}>暂无可显示的使用时长；授权后使用一段时间再刷新。</Label>}</> : null}
      {data.settings.focusGuardMode==='nudge' && guardDoubleConfirmed ? <><SectionTitle title="专注期间的守护" /><Button label={data.settings.focusGuardEnabled?'关闭专注守护':'开启专注守护'} icon={data.settings.focusGuardEnabled?'shield-outline':'shield-checkmark-outline'} variant={data.settings.focusGuardEnabled?'soft':'primary'} disabled={!focusGuardStatus?.accessibilityEnabled} onPress={()=>run(toggleFocusGuard)} />{!focusGuardStatus?.accessibilityEnabled ? <Label muted style={{fontSize:11,marginTop:8}}>请先在系统“无障碍”中开启 CampusFlow 专注守护，按钮才可用。</Label> : null}{focusGuardStatus?.focusActive ? <View style={{marginTop:10}}><Button label="暂停守护 5 分钟" small variant="ghost" onPress={()=>run(pauseNativeGuard)}/></View> : null}</> : null}
      <Label muted style={{fontSize:11,marginTop:18}}>你可随时在此关闭守护，也可在 Android 系统设置撤销“使用情况访问”或无障碍服务。守护只在正在运行的番茄专注中生效，计时暂停或结束会自动释放。</Label>
    </>}
  </Sheet>
  <Sheet visible={privacy} title="隐私说明" onClose={()=>setPrivacy(false)}><Label muted>聊天、人设、待办和专注记录默认存储在设备本地。只有你主动切换至真实 API 模式并发送消息时，当前人设偏好和对话内容才会发送到已配置的 AI 代理；API Key 只应放在服务端环境变量中。若代理使用 Gemini 免费层，Google 可能将提交内容用于改进产品。</Label><Notice>默认不读取通讯录、定位或其他应用。只有在新版 Android APK 中，你选择应用、连续完成两次确认并自行开启系统权限后，CampusFlow 才会读取所选应用的名称、包名和使用时长；专注守护只读取前台包名并把选中应用带回桌面。不会读取应用内聊天、输入、图片、通知、账号、密码或屏幕内容，也不会上传这些信息。</Notice></Sheet>
  <Sheet visible={about} title="关于项目" onClose={()=>setAbout(false)}><Label muted>CampusFlow AI 是一款可继续开发的 React Native / Expo 项目。它帮助大学生把对话中的计划变成待办，再通过专注计时和统计看见自己的节奏。</Label><Label muted style={{fontSize:12,marginTop:14}}>版权所有：© 2026 Celia · 保留所有权利。</Label><Notice>AI 是工具，不是现实关系的替代；内容由 AI 生成，请自行判断。</Notice></Sheet>
  </SafeAreaView></Background>;
}

function PermissionCard({title,detail,enabled,actionLabel,onPress}:{title:string;detail:string;enabled:boolean;actionLabel:string;onPress:()=>void}) {
  return <Card style={{padding:14}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{flex:1}}><Label style={{fontWeight:'700'}}>{title}</Label><Label muted style={{fontSize:11,marginTop:2}}>{detail}</Label><Label style={{fontSize:11,color:enabled?'#28755F':'#AD4646',marginTop:5}}>{enabled?'已开启':'未开启'}</Label></View><Button label={enabled?'检查设置':actionLabel} small variant={enabled?'ghost':'soft'} onPress={onPress}/></View></Card>;
}

function UsageCard({entry}:{entry:FocusGuardUsageEntry}) {
  return <Card style={{padding:14,marginBottom:9}}><View style={styles.row}><View style={{flex:1}}><Label style={{fontWeight:'700'}}>{entry.label}</Label><Label muted style={{fontSize:10}}>{entry.packageName}</Label></View><Label style={{fontWeight:'700'}}>{formatUsageDuration(entry.foregroundMs)}</Label></View></Card>;
}

function formatUsageDuration(milliseconds:number):string {
  const minutes = Math.floor(Math.max(0,milliseconds) / 60_000);
  if (minutes < 60) return String(minutes) + ' 分钟';
  return String(Math.floor(minutes / 60)) + ' 小时 ' + String(minutes % 60) + ' 分';
}

function Setting({icon,title,detail,onPress,destructive=false}:{icon:IconName;title:string;detail:string;onPress:()=>void;destructive?:boolean}){return <Card style={{padding:15,marginBottom:10}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:destructive?'#F8EAE7':'#EAF1E8'}}><Icon name={icon} color={destructive?'#AD4646':'#28755F'}/></View><View style={{flex:1}}><Label style={{fontSize:14,fontWeight:'600',color:destructive?'#AD4646':undefined}}>{title}</Label><Label muted style={{fontSize:11}}>{detail}</Label></View><IconButton name="chevron-forward" label={title} onPress={onPress}/></View></Card>;}
