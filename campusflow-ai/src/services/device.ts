import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Persona, Task } from '../core/types';

const TASK_CHANNEL = 'tasks';
const PERSONA_MESSAGE_CHANNEL = 'persona-messages';

export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('未获得相册权限。你仍可使用默认头像和主题。');
  const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing:true, quality:.8 });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('图片读取失败'));
      reader.readAsDataURL(blob);
    });
  }
  if (!FileSystem.documentDirectory) throw new Error('无法访问本地图片目录');
  const destination = `${FileSystem.documentDirectory}campusflow-image-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from:uri, to:destination });
  return destination;
}

export async function exportJson(filename:string, value:unknown): Promise<void> {
  const text = JSON.stringify(value, null, 2);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type:'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return;
  }
  if (!FileSystem.cacheDirectory) throw new Error('无法访问导出目录');
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, text, { encoding:FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('此设备不支持分享文件');
  await Sharing.shareAsync(uri, { mimeType:'application/json', dialogTitle:'导出我的数据' });
}

async function notificationModule() { return import('expo-notifications'); }

async function prepareNotifications() {
  const notifications = await notificationModule();
  if (Platform.OS === 'android') {
    await Promise.all([
      notifications.setNotificationChannelAsync(TASK_CHANNEL, {
        name:'任务提醒', importance:notifications.AndroidImportance.DEFAULT
      }),
      notifications.setNotificationChannelAsync(PERSONA_MESSAGE_CHANNEL, {
        name:'人设消息', importance:notifications.AndroidImportance.HIGH, sound:'default', vibrationPattern:[0, 240, 160, 240]
      })
    ]);
  }
  return notifications;
}

export async function requestNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') throw new Error('网页预览不支持本地通知，请在安卓 App 中开启。');
  const notifications = await prepareNotifications();
  const existing = await notifications.getPermissionsAsync();
  const granted = existing.granted || (await notifications.requestPermissionsAsync()).granted;
  if (granted) notifications.setNotificationHandler({
    handleNotification:async () => ({ shouldShowBanner:true, shouldShowList:true, shouldPlaySound:true, shouldSetBadge:false })
  });
  return granted;
}

async function requireNotificationPermission() {
  if (Platform.OS === 'web') throw new Error('网页预览不支持本地通知，请在安卓 App 中开启。');
  const notifications = await prepareNotifications();
  if (!(await notifications.getPermissionsAsync()).granted) throw new Error('通知权限未开启。');
  return notifications;
}

export async function scheduleReminder(task:Task): Promise<string | null> {
  if (Platform.OS === 'web' || task.completed || !task.dueAt || new Date(task.dueAt).getTime() <= Date.now()) return null;
  const notifications = await requireNotificationPermission();
  return notifications.scheduleNotificationAsync({
    content:{ title:'CampusFlow · 到行动的时间了', body:task.title, data:{ taskId:task.id } },
    trigger:{ type:notifications.SchedulableTriggerInputTypes.DATE, date:new Date(task.dueAt), channelId:TASK_CHANNEL }
  });
}

function parseReminderTime(time:string): { hour:number; minute:number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error('提醒时间格式无效。');
  return { hour:Number(match[1]), minute:Number(match[2]) };
}

function personaMessageBody(persona:Persona): string {
  const greeting = persona.greeting.replace(/\s+/g, ' ').trim();
  if (greeting) return greeting.slice(0, 120);
  const nickname = persona.userNickname.trim() || '同学';
  return `${nickname}，给今天留一点时间，我们从一小步开始。`;
}

function personaMessageContent(persona:Persona) {
  return {
    title:`${persona.name} 发来一条消息`,
    body:personaMessageBody(persona),
    sound:'default' as const,
    data:{ type:'persona-message', personaId:persona.id }
  };
}

/** Schedules one local message every day. It does not call AI or run a background service. */
export async function schedulePersonaMessage(persona:Persona, time:string): Promise<string> {
  const notifications = await requireNotificationPermission();
  const { hour, minute } = parseReminderTime(time);
  return notifications.scheduleNotificationAsync({
    content:personaMessageContent(persona),
    trigger:{ type:notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId:PERSONA_MESSAGE_CHANNEL }
  });
}

/** Delivers an immediate on-device preview of the selected persona's local message. */
export async function sendPersonaMessageTest(persona:Persona): Promise<string> {
  const notifications = await requireNotificationPermission();
  return notifications.scheduleNotificationAsync({ content:personaMessageContent(persona), trigger:null });
}

export async function cancelReminder(id:string | null | undefined): Promise<void> {
  if (id && Platform.OS !== 'web') await (await notificationModule()).cancelScheduledNotificationAsync(id);
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS !== 'web') await (await notificationModule()).cancelAllScheduledNotificationsAsync();
}
