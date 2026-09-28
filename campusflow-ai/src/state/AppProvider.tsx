import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataStore, createInitialData, createTask, finishTimer, getTimerProgress, setTaskCompleted, updateTask } from '../core';
import type { AppData, PersonaNotificationTone, Settings, Task, TaskDraft } from '../core/types';
import { cancelAllReminders, cancelPersonaMessages, cancelReminder, normalizePersonaMessageTimes, requestNotifications, schedulePersonaMessages, scheduleReminder, sendPersonaMessageTest } from '../services/device';
import { Button, Label, Notice, Sheet, colors } from '../components/ui';

type ConfirmRequest = { title:string; message:string; resolve:(value:boolean) => void };
export type PersonaNotificationOptions = {
  enabled:boolean;
  personaId?:string | null;
  /** Legacy single daily time. It remains accepted for older callers. */
  time?:string;
  /** One or more daily times for local device reminders. */
  times?:readonly string[];
  tone?:PersonaNotificationTone;
  quietHoursEnabled?:boolean;
  quietHoursStart?:string;
  quietHoursEnd?:string;
};
type AppContextValue = {
  data:AppData;
  commit:(updater:(current:AppData) => AppData) => Promise<AppData>;
  updateSettings:(patch:Partial<Settings>) => Promise<AppData>;
  setNotificationsEnabled:(enabled:boolean) => Promise<void>;
  configurePersonaNotification:(options:PersonaNotificationOptions) => Promise<void>;
  sendPersonaNotificationTest:(personaId?:string | null) => Promise<void>;
  toast:(message:string) => void;
  confirm:(title:string, message:string) => Promise<boolean>;
  run:(task:() => Promise<unknown>) => void;
  saveTask:(draft:TaskDraft, existing?:Task) => Promise<Task>;
  toggleTask:(task:Task) => Promise<void>;
  removeTask:(task:Task) => Promise<void>;
  resetAll:() => Promise<void>;
};
const AppContext = createContext<AppContextValue | null>(null);

function personaNotificationTimes(settings:Settings): string[] {
  const configured = settings.personaNotificationTimes.length ? settings.personaNotificationTimes : [settings.personaNotificationTime];
  return normalizePersonaMessageTimes(configured);
}

function configuredPersonaNotificationIds(settings:Settings): string[] {
  return [...new Set([...settings.personaNotificationIds, settings.personaNotificationId].filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

function personaScheduleOptions(settings:Settings) {
  return {
    tone:settings.personaNotificationTone,
    quietHoursEnabled:settings.personaQuietHoursEnabled,
    quietHoursStart:settings.personaQuietHoursStart,
    quietHoursEnd:settings.personaQuietHoursEnd,
  };
}

function requestedPersonaTimes(settings:Settings, options:PersonaNotificationOptions): string[] {
  const requested = options.times ?? (options.time ? [options.time] : personaNotificationTimes(settings));
  return normalizePersonaMessageTimes(requested);
}

export function AppProvider({ children }: PropsWithChildren) {
  const store = useRef(new DataStore(AsyncStorage)).current;
  const [data, setData] = useState<AppData>(createInitialData());
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmRequest | null>(null);
  const completing = useRef(false);
  const clearingPersonaMessageIds = useRef(false);

  const toast = useCallback((message:string) => setToastMessage(message), []);
  const load = useCallback(async () => {
    try { setLoadError(''); setData(await store.load()); setReady(true); }
    catch (error) { setLoadError(error instanceof Error ? error.message : '本地数据读取失败'); }
  }, [store]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 4800);
    return () => clearTimeout(timer);
  }, [toastMessage]);
  const commit = useCallback(async (updater:(current:AppData) => AppData) => {
    const next = await store.update(updater); setData(next); return next;
  }, [store]);
  const updateSettings = useCallback((patch:Partial<Settings>) => commit((current) => ({ ...current, settings:{...current.settings, ...patch} })), [commit]);
  const run = useCallback((task:() => Promise<unknown>) => { void task().catch((error:unknown) => toast(error instanceof Error ? error.message : '操作失败，请重试')); }, [toast]);
  const confirm = useCallback((title:string, message:string) => new Promise<boolean>((resolve) => setConfirmation({title, message, resolve})), []);

  const setNotificationsEnabled = useCallback(async (enabled:boolean) => {
    const current = store.getSnapshot();
    if (current.settings.notificationsEnabled === enabled) return;
    if (!enabled) {
      await cancelAllReminders();
      await commit((next) => ({
        ...next,
        tasks:next.tasks.map((task) => ({ ...task, notificationId:null })),
        settings:{ ...next.settings, notificationsEnabled:false, personaNotificationId:null, personaNotificationIds:[] }
      }));
      return;
    }
    const granted = await requestNotifications();
    if (!granted) throw new Error('通知权限被拒绝；可在系统设置中再次开启。');
    const before = store.getSnapshot();
    await cancelPersonaMessages(configuredPersonaNotificationIds(before.settings));
    const taskNotifications = await Promise.all(before.tasks.map(async (task) => ({
      id:task.id, notificationId:await scheduleReminder(task)
    })));
    const notificationByTaskId = new Map(taskNotifications.map((item) => [item.id, item.notificationId]));
    const persona = before.personas.find((item) => item.id === before.settings.personaNotificationPersonaId);
    const times = personaNotificationTimes(before.settings);
    const personaNotificationIds = before.settings.personaNotificationsEnabled && persona
      ? await schedulePersonaMessages(persona, times, personaScheduleOptions(before.settings))
      : [];
    await commit((next) => ({
      ...next,
      tasks:next.tasks.map((task) => ({ ...task, notificationId:notificationByTaskId.get(task.id) ?? null })),
      settings:{
        ...next.settings,
        notificationsEnabled:true,
        personaNotificationTime:times[0] ?? before.settings.personaNotificationTime,
        personaNotificationId:personaNotificationIds[0] ?? null,
        personaNotificationIds
      }
    }));
  }, [commit, store]);

  const configurePersonaNotification = useCallback(async (options:PersonaNotificationOptions) => {
    let current = store.getSnapshot();
    const selectedId = options.personaId ?? current.settings.personaNotificationPersonaId ?? current.settings.selectedPersonaId;
    const selectedTimes = requestedPersonaTimes(current.settings, options);
    const selectedTone = options.tone ?? current.settings.personaNotificationTone;
    const quietHoursEnabled = options.quietHoursEnabled ?? current.settings.personaQuietHoursEnabled;
    const quietHoursStart = options.quietHoursStart ?? current.settings.personaQuietHoursStart;
    const quietHoursEnd = options.quietHoursEnd ?? current.settings.personaQuietHoursEnd;
    const selectedTime = selectedTimes[0] ?? current.settings.personaNotificationTime;
    if (!options.enabled) {
      await cancelPersonaMessages(configuredPersonaNotificationIds(current.settings));
      await commit((next) => ({ ...next, settings:{
        ...next.settings,
        personaNotificationsEnabled:false,
        personaNotificationPersonaId:selectedId,
        personaNotificationTime:selectedTime,
        personaNotificationId:null,
        personaNotificationTimes:selectedTimes,
        personaNotificationIds:[],
        personaNotificationTone:selectedTone,
        personaQuietHoursEnabled:quietHoursEnabled,
        personaQuietHoursStart:quietHoursStart,
        personaQuietHoursEnd:quietHoursEnd
      } }));
      return;
    }
    if (!selectedId) throw new Error('请先创建或选择一位 AI 人设。');
    if (!current.settings.notificationsEnabled) {
      await setNotificationsEnabled(true);
      current = store.getSnapshot();
    }
    const persona = current.personas.find((item) => item.id === selectedId);
    if (!persona) throw new Error('所选 AI 人设已不存在，请重新选择。');
    const replacementIds = await schedulePersonaMessages(persona, selectedTimes, {
      tone:selectedTone, quietHoursEnabled, quietHoursStart, quietHoursEnd
    });
    if (!replacementIds.length) throw new Error('所选提醒时间都位于免打扰时段，请调整时间或关闭免打扰。');
    try {
      await cancelPersonaMessages(configuredPersonaNotificationIds(current.settings));
    } catch (error) {
      await cancelPersonaMessages(replacementIds);
      throw error;
    }
    await commit((next) => ({ ...next, settings:{
      ...next.settings,
      personaNotificationsEnabled:true,
      personaNotificationPersonaId:persona.id,
      personaNotificationTime:selectedTime,
      personaNotificationId:replacementIds[0] ?? null,
      personaNotificationTimes:selectedTimes,
      personaNotificationIds:replacementIds,
      personaNotificationTone:selectedTone,
      personaQuietHoursEnabled:quietHoursEnabled,
      personaQuietHoursStart:quietHoursStart,
      personaQuietHoursEnd:quietHoursEnd
    } }));
  }, [commit, setNotificationsEnabled, store]);

  const sendPersonaNotificationTest = useCallback(async (personaId?:string | null) => {
    const granted = await requestNotifications();
    if (!granted) throw new Error('通知权限被拒绝；可在系统设置中再次开启。');
    if (!store.getSnapshot().settings.notificationsEnabled) await setNotificationsEnabled(true);
    const current = store.getSnapshot();
    const selectedId = personaId ?? current.settings.personaNotificationPersonaId ?? current.settings.selectedPersonaId;
    const persona = current.personas.find((item) => item.id === selectedId);
    if (!persona) throw new Error('请先创建或选择一位 AI 人设。');
    await sendPersonaMessageTest(persona, current.settings.personaNotificationTone);
  }, [setNotificationsEnabled, store]);

  useEffect(() => {
    const settings = data.settings;
    const ids = configuredPersonaNotificationIds(settings);
    if (!ready || clearingPersonaMessageIds.current || ids.length === 0 || (settings.notificationsEnabled && settings.personaNotificationsEnabled)) return;
    clearingPersonaMessageIds.current = true;
    void cancelPersonaMessages(ids)
      .then(() => commit((current) => ({ ...current, settings:{ ...current.settings, personaNotificationId:null, personaNotificationIds:[] } })))
      .catch((error:unknown) => toast(error instanceof Error ? error.message : '角色消息提醒取消失败'))
      .finally(() => { clearingPersonaMessageIds.current = false; });
  }, [commit, data.settings, ready, toast]);

  useEffect(() => {
    if (!ready) return;
    const settle = () => {
      const current = store.getSnapshot();
      if (completing.current || !current.timer || !getTimerProgress(current.timer).isComplete) return;
      completing.current = true;
      void commit((next) => next.timer && getTimerProgress(next.timer).isComplete
        ? { ...next, focusSessions:[...next.focusSessions, finishTimer(next.timer)], timer:null }
        : next
      ).then(() => toast('这一段时间已完成，专注记录已保存。'))
        .catch((error:unknown) => toast(error instanceof Error ? error.message : '专注保存失败'))
        .finally(() => { completing.current = false; });
    };
    settle();
    const timer = setInterval(settle, 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') settle(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [commit, ready, store, toast]);

  const updateReminder = useCallback(async (task:Task) => {
    try {
      await cancelReminder(task.notificationId);
      const notificationId = store.getSnapshot().settings.notificationsEnabled ? await scheduleReminder(task) : null;
      if (notificationId !== task.notificationId) await commit((current) => ({
        ...current, tasks:current.tasks.map((item) => item.id === task.id ? { ...item, notificationId } : item)
      }));
    } catch (error) {
      toast(`任务已保存；提醒未设置：${error instanceof Error ? error.message : '请检查通知权限'}`);
    }
  }, [commit, store, toast]);

  const saveTask = useCallback(async (draft:TaskDraft, existing?:Task) => {
    const task = existing ? updateTask(existing, draft) : createTask(draft);
    await commit((current) => ({ ...current, tasks:existing ? current.tasks.map((item) => item.id === task.id ? task : item) : [task, ...current.tasks] }));
    await updateReminder(task);
    toast(existing ? '任务已更新' : '已加入待办，准备开始吧');
    return task;
  }, [commit, toast, updateReminder]);
  const toggleTask = useCallback(async (task:Task) => {
    const next = setTaskCompleted(task, !task.completed);
    await commit((current) => ({ ...current, tasks:current.tasks.map((item) => item.id === task.id ? next : item) }));
    await updateReminder(next);
    toast(next.completed ? '又完成了一小步' : '任务已恢复');
  }, [commit, toast, updateReminder]);
  const removeTask = useCallback(async (task:Task) => {
    if (!await confirm('删除这项任务？', '已有专注记录会保留，但不再关联这项任务。')) return;
    await cancelReminder(task.notificationId);
    await commit((current) => ({
      ...current,
      tasks:current.tasks.filter((item) => item.id !== task.id),
      focusSessions:current.focusSessions.map((item) => item.taskId === task.id ? {...item, taskId:null} : item),
      timer:current.timer?.taskId === task.id ? {...current.timer, taskId:null} : current.timer
    }));
    toast('任务已删除');
  }, [commit, confirm, toast]);
  const resetAll = useCallback(async () => {
    await cancelAllReminders();
    const next = await store.clear();
    setData(next); toast('本地数据已清除');
  }, [store, toast]);

  if (!ready) return <View style={{flex:1,backgroundColor:colors.cream,justifyContent:'center',padding:26,gap:20}}>
    {loadError ? <><Notice error>{loadError} 为保护已有数据，应用没有自动覆盖它。</Notice><Button label="重新读取" onPress={() => void load()} /><Button label="清除数据并重新开始" variant="danger" onPress={() => run(resetAll)} /></> : <><ActivityIndicator color={colors.green}/><Label style={{textAlign:'center'}}>让今天，慢慢进入状态。</Label></>}
  </View>;
  return <AppContext.Provider value={{data,commit,updateSettings,setNotificationsEnabled,configurePersonaNotification,sendPersonaNotificationTest,toast,confirm,run,saveTask,toggleTask,removeTask,resetAll}}>
    {children}
    {toastMessage ? <View pointerEvents="none" style={{position:'absolute',left:20,right:20,top:55,zIndex:100,alignSelf:'center',maxWidth:600,borderRadius:16,backgroundColor:colors.ink,padding:15}}><Label style={{color:'#fff',fontSize:13}}>{toastMessage}</Label></View> : null}
    <Sheet visible={Boolean(confirmation)} title={confirmation?.title ?? ''} onClose={() => { confirmation?.resolve(false); setConfirmation(null); }}>
      <Label muted>{confirmation?.message}</Label><View style={{flexDirection:'row',gap:10,justifyContent:'flex-end',marginTop:24}}>
        <Button label="取消" variant="ghost" onPress={() => { confirmation?.resolve(false); setConfirmation(null); }} />
        <Button label="确认" onPress={() => { confirmation?.resolve(true); setConfirmation(null); }} />
      </View>
    </Sheet>
  </AppContext.Provider>;
}
export function useApp():AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is required');
  return value;
}
