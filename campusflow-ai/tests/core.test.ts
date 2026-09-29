import { describe, expect, it } from 'vitest';
import {
  DataStore, buildSystemPrompt, createInitialData, createPersona, createTask, createTimer,
  extractTaskLocally, finishTimer, getStatistics, getTimerProgress, pauseTimer, resumeTimer,
  setTaskCompleted, updateTask, updatePersona, validatePersona, importPersona, migrateData, preparePersonaImport, setPersonaAutoCompletion, suggestPersonaCompletionFromInteraction, completePersonaFromInteraction, focusGuardScopeKey
} from '../src/core';
import type { StorageAdapter } from '../src/core/types';

class MemoryStorage implements StorageAdapter {
  value:string | null = null;
  async getItem(){return this.value;}
  async setItem(_key:string,value:string){this.value=value;}
  async removeItem(){this.value=null;}
}
describe('persona validation and prompt',()=>{
  it('requires a name and builds safety-preserving system prompt',()=>{
    expect(()=>validatePersona({name:''})).toThrow('角色名称不能为空');
    const persona=createPersona({name:'知夏',identity:'AI 学习搭子',background:'',personalityTags:['耐心'],speakingStyle:'清晰',responseLength:'medium',userNickname:'同学',greeting:'你好',dos:['拆解任务'],donts:['制造依赖'],pinnedMemories:[],avatarUri:null});
    const prompt=buildSystemPrompt(persona);
    expect(prompt).toContain('人工智能');
    expect(prompt).toContain('不诱导情感依赖');
    expect(prompt).toContain('知夏');
  });
  it('imports pasted persona documents without requiring JSON',()=>{
    const document=['角色名称：林晚','身份：沉静的文学陪伴 AI','性格：克制、敏锐、温柔','说话风格：简洁而有画面感。','开场白：今天想聊什么？','背叛也不因过去爱过而得到原谅。'].join('\n');
    const persona=importPersona(document,new Date('2026-09-25T00:00:00Z'),{fallbackName:'备用名'});
    expect(persona.name).toBe('备用名');
    expect(persona.identity).toBe('沉静的文学陪伴 AI');
    expect(persona.personalityTags).toEqual(['克制','敏锐','温柔']);
    expect(persona.background).toBe(document);
    expect(persona.greeting).toBe('今天想聊什么？');
  });
  it('preserves imported backgrounds beyond the former character limit',()=>{
    const document=`角色名称：长文角色\n${'设定内容。'.repeat(3000)}`;
    const persona=importPersona(document);
    expect(persona.background).toBe(document);
    expect(persona.background.length).toBeGreaterThan(10000);
  });
  it('keeps JSON import and reports malformed JSON clearly',()=>{
    const input={format:'campusflow-persona',persona:{name:'阿澈',avatarUri:null,identity:'AI 伙伴',background:'',personalityTags:[],speakingStyle:'清晰',responseLength:'medium',userNickname:'同学',greeting:'你好',dos:[],donts:[],pinnedMemories:[]}};
    expect(importPersona(JSON.stringify(input)).name).toBe('阿澈');
    expect(()=>importPersona('{"name":')).toThrow('JSON 文件格式无效');
  });
});
describe('persona document review and completion',()=>{
  it('parses labelled and multiline documents into a reviewable draft',()=>{
    const document=['【角色名称】林晚','角色定位：沉静的文学陪伴 AI','性格关键词：克制、敏锐、温柔','说话风格','简洁而有画面感。','背景设定：','她会陪用户整理阅读与写作中的想法。'].join('\n');
    const result=preparePersonaImport(document);
    expect(result.source).toBe('document');
    expect(result.draft).toMatchObject({name:'林晚',identity:'沉静的文学陪伴 AI',personalityTags:['克制','敏锐','温柔'],speakingStyle:'简洁而有画面感。',background:document});
    expect(result.missing.map((field)=>field.key)).toEqual(['userNickname','greeting','dos','donts','pinnedMemories']);
    expect(result.draft.completion).toEqual({pending:['userNickname','greeting','dos','donts','pinnedMemories'],autoFromChat:false});
  });
  it('only applies explicit interaction details to fields that were pending and owner-enabled',()=>{
    const imported=importPersona(['角色名称：林晚','背景设定：一位阅读陪伴 AI。'].join('\n'));
    const interaction=['身份：沉静的文学陪伴 AI','说话风格：简洁而有画面感。','请叫我小夏','开场白：今天想聊什么？'].join('\n');
    const disabled=completePersonaFromInteraction(imported,interaction,new Date('2026-09-25T00:00:00Z'));
    expect(disabled.changed).toEqual([]);
    const proposed=suggestPersonaCompletionFromInteraction(imported,interaction,new Date('2026-09-25T00:00:00Z'));
    expect(proposed.changed).toEqual(['identity','speakingStyle','userNickname','greeting']);
    expect(proposed.persona).toMatchObject({identity:'沉静的文学陪伴 AI',speakingStyle:'简洁而有画面感。',userNickname:'小夏',greeting:'今天想聊什么？'});
    expect(proposed.persona.completion?.pending).toContain('personalityTags');
    const enabled=setPersonaAutoCompletion(imported,true,new Date('2026-09-25T00:00:00Z'));
    const applied=completePersonaFromInteraction(enabled,interaction,new Date('2026-09-25T00:01:00Z'));
    expect(applied.changed).toEqual(proposed.changed);
    expect(applied.persona.completion?.pending).not.toContain('identity');
  });
  it('does not treat ordinary questions as auto-completion instructions',()=>{
    const imported=setPersonaAutoCompletion(importPersona('背景设定：一位阅读陪伴 AI。'),true,new Date('2026-09-25T00:00:00Z'));
    const result=completePersonaFromInteraction(imported,'你的名字是什么？',new Date('2026-09-25T00:01:00Z'));
    expect(result.changed).toEqual([]);
    expect(result.persona.name).toBe('新角色');
  });  it('keeps unresolved metadata until a user edits that specific field',()=>{
    const imported=importPersona('角色名称：林晚');
    const edited=updatePersona(imported,{...imported,identity:'文学陪伴 AI'},new Date('2026-09-25T00:00:00Z'));
    expect(edited.completion?.pending).not.toContain('identity');
    expect(edited.completion?.pending).toContain('speakingStyle');
  });
});
describe('tasks and extraction',()=>{
  it('creates, edits and completes a task with a precise due date',()=>{
    const first=createTask({title:'复习高数',description:'第三章',category:'学习',dueDate:'2026-09-19',dueTime:'15:00',estimatedMinutes:60,personaId:null,sourceMessageId:null},new Date('2026-09-18T00:00:00'));
    expect(first.dueAt).toBeTruthy();
    const edited=updateTask(first,{...first,title:'复习高数第三章',estimatedMinutes:90},new Date('2026-09-18T01:00:00'));
    const completed=setTaskCompleted(edited,true,new Date('2026-09-19T10:00:00Z'));
    expect(completed.title).toBe('复习高数第三章');
    expect(completed.completedAt).toBe('2026-09-19T10:00:00.000Z');
  });
  it('extracts only supported Chinese date/time facts and leaves uncertain parts empty',()=>{
    const draft=extractTaskLocally('明天下午三点复习高数一小时。',new Date('2026-09-18T08:00:00'));
    expect(draft).toMatchObject({title:'复习高数',category:'学习',dueDate:'2026-09-19',dueTime:'15:00',estimatedMinutes:60});
    const uncertain=extractTaskLocally('复习高数三点开始',new Date('2026-09-18T08:00:00'));
    expect(uncertain.dueTime).toBeNull();
  });
});
describe('timer state and background restoration',()=>{
  it('pauses, resumes and saves completion accurately',()=>{
    const start=new Date('2026-09-18T08:00:00');
    const timer=createTimer({mode:'focus',minutes:25},start);
    expect(getTimerProgress(timer,new Date('2026-09-18T08:10:00')).remainingSeconds).toBe(900);
    const paused=pauseTimer(timer,new Date('2026-09-18T08:10:00'));
    expect(getTimerProgress(paused,new Date('2026-09-18T09:00:00')).elapsedSeconds).toBe(600);
    const resumed=resumeTimer(paused,new Date('2026-09-18T09:00:00'));
    const session=finishTimer(resumed,new Date('2026-09-18T09:15:00'));
    expect(session.status).toBe('completed');
    expect(session.actualSeconds).toBe(1500);
  });
  it('restores elapsed time from timestamps after the app is inactive',()=>{
    const timer=createTimer({minutes:25},new Date('2026-09-18T08:00:00'));
    const restored=getTimerProgress(timer,new Date('2026-09-18T08:26:00'));
    expect(restored.isComplete).toBe(true);
    expect(restored.elapsedSeconds).toBe(1500);
  });
});
describe('statistics and persistent local data',()=>{
  it('aggregates real local focus and completion data',()=>{
    const data=createInitialData(new Date('2026-09-18T00:00:00'));
    data.focusSessions.push({id:'f1',taskId:null,category:'学习',plannedMinutes:25,actualSeconds:1500,status:'completed',mode:'focus',startedAt:'2026-09-18T08:00:00.000Z',endedAt:'2026-09-18T08:25:00.000Z'});
    const task=createTask({title:'任务',description:'',category:'学习',dueDate:null,dueTime:null,estimatedMinutes:null,personaId:null,sourceMessageId:null},new Date('2026-09-18T07:00:00'));
    data.tasks.push(setTaskCompleted(task,true,new Date('2026-09-18T09:00:00')));
    const stats=getStatistics(data,'day',new Date('2026-09-18T20:00:00'));
    expect(stats.todayFocusMinutes).toBe(25);
    expect(stats.todayCompletedTasks).toBe(1);
    expect(stats.categoryMinutes.学习).toBe(25);
  });
  it('persists and reloads data through the isolated storage layer',async()=>{
    const memory=new MemoryStorage();const first=new DataStore(memory);
    await first.load();
    await first.update((data)=>({...data,tasks:[...data.tasks,createTask({title:'持久化任务',description:'',category:'学习',dueDate:null,dueTime:null,estimatedMinutes:null,personaId:null,sourceMessageId:null})]}));
    const second=new DataStore(memory);const restored=await second.load();
    expect(restored.tasks[0]?.title).toBe('持久化任务');
  });  it('migrates existing local settings to persona message reminder defaults',()=>{
    const previous=JSON.parse(JSON.stringify(createInitialData(new Date('2026-09-18T00:00:00Z')))) as Record<string, unknown>;
    const settings=previous.settings as Record<string, unknown>;
    delete settings.personaNotificationsEnabled;
    delete settings.personaNotificationPersonaId;
    delete settings.personaNotificationTime;
    delete settings.personaNotificationId;
    delete settings.personaNotificationTimes;
    delete settings.personaNotificationIds;
    delete settings.personaNotificationTone;
    delete settings.personaQuietHoursEnabled;
    delete settings.personaQuietHoursStart;
    delete settings.personaQuietHoursEnd;
    delete settings.focusGuardMode;
    delete settings.focusGuardEnabled;
    delete settings.focusGuardSelectedApps;
    delete settings.focusGuardConsent;
    const restored=migrateData(previous);
    expect(restored.settings.personaNotificationsEnabled).toBe(false);
    expect(restored.settings.personaNotificationPersonaId).toBe(restored.settings.selectedPersonaId);
    expect(restored.settings.personaNotificationTime).toBe('20:00');
    expect(restored.settings.personaNotificationId).toBeNull();
    expect(restored.settings.personaNotificationTimes).toEqual(['20:00']);
    expect(restored.settings.personaNotificationIds).toEqual([]);
    expect(restored.settings.personaNotificationTone).toBe('warm');
    expect(restored.settings.personaQuietHoursEnabled).toBe(false);
    expect(restored.settings.focusGuardMode).toBe('insights');
    expect(restored.settings.focusGuardEnabled).toBe(false);
    expect(restored.settings.focusGuardSelectedApps).toEqual([]);
    expect(restored.settings.focusGuardConsent).toBeNull();
  });
  it('invalidates stale focus guard confirmation when its application scope changes',()=>{
    const previous=JSON.parse(JSON.stringify(createInitialData(new Date('2026-09-18T00:00:00Z')))) as Record<string, unknown>;
    const settings=previous.settings as Record<string, unknown>;
    settings.focusGuardMode='nudge';
    settings.focusGuardEnabled=true;
    settings.focusGuardSelectedApps=[{packageName:'com.example.video',label:'视频',selectedAt:'2026-09-18T00:00:00.000Z'}];
    settings.focusGuardConsent={disclosureVersion:1,scopeKey:focusGuardScopeKey('insights',[]),firstConfirmedAt:'2026-09-18T00:00:00.000Z',secondConfirmedAt:'2026-09-18T00:01:00.000Z'};
    const restored=migrateData(previous);
    expect(restored.settings.focusGuardConsent).toBeNull();
    expect(restored.settings.focusGuardEnabled).toBe(false);
    expect(restored.settings.focusGuardSelectedApps[0]?.packageName).toBe('com.example.video');
  });  it('merges legacy and multi-time persona message IDs without losing cancellation targets',()=>{
    const previous=JSON.parse(JSON.stringify(createInitialData(new Date('2026-09-18T00:00:00Z')))) as Record<string, unknown>;
    const settings=previous.settings as Record<string, unknown>;
    settings.personaNotificationId='legacy-id';
    settings.personaNotificationIds=['daily-one','legacy-id','daily-one'];
    const restored=migrateData(previous);
    expect(restored.settings.personaNotificationIds).toHaveLength(2);
    expect(restored.settings.personaNotificationIds).toEqual(expect.arrayContaining(['legacy-id','daily-one']));
    expect(restored.settings.personaNotificationIds).toContain(restored.settings.personaNotificationId);
  });
});