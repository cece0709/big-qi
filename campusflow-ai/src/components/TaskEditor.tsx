import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { TASK_CATEGORIES } from '../core/types';
import type { Task, TaskDraft } from '../core/types';
import { useApp } from '../state/AppProvider';
import { Button, Chip, Field, Label, Notice, Sheet, styles } from './ui';

export const emptyTaskDraft = ():TaskDraft => ({
  title:'', description:'', category:'学习', dueDate:null, dueTime:null, estimatedMinutes:25, sourceMessageId:null, personaId:null
});
export function TaskEditor({ visible, onClose, initial, existing, onSaved }: {
  visible:boolean; onClose:() => void; initial?:TaskDraft | null; existing?:Task; onSaved?:() => void;
}) {
  const { data, saveTask } = useApp();
  const [draft, setDraft] = useState<TaskDraft>(emptyTaskDraft());
  const [minutes, setMinutes] = useState('25');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const source = existing ?? initial ?? emptyTaskDraft();
    setDraft({...source}); setMinutes(source.estimatedMinutes === null ? '' : String(source.estimatedMinutes)); setError('');
  }, [visible, initial, existing]);
  const update = (patch:Partial<TaskDraft>) => setDraft((current) => ({...current, ...patch}));
  const save = async () => {
    setSaving(true); setError('');
    try { await saveTask({...draft, estimatedMinutes:minutes.trim() ? Number(minutes) : null}, existing); onSaved?.(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  };
  return <Sheet visible={visible} title={existing ? '编辑待办' : '把想法变成行动'} onClose={() => { if (!saving) onClose(); }}>
    <Label muted style={{marginBottom:20}}>{draft.sourceMessageId ? '来自聊天 · 确认一下，让计划更合适你。' : '给今天留一个清晰的小目标。'}</Label>
    <Field label="任务标题" value={draft.title} maxLength={120} placeholder="例如：复习高数第三章" onChangeText={(title) => update({title})} />
    <Field label="备注（选填）" value={draft.description} multiline maxLength={4000} onChangeText={(description) => update({description})} />
    <Label muted style={{fontSize:12,marginBottom:8}}>任务分类</Label><View style={[styles.wrap,{marginBottom:18}]}>{TASK_CATEGORIES.map((category) => <Chip key={category} label={category} selected={draft.category===category} onPress={() => update({category})}/>)}</View>
    <View style={{flexDirection:'row',gap:12}}><View style={{flex:1}}><Field label="日期（可留空）" value={draft.dueDate ?? ''} placeholder="YYYY-MM-DD" onChangeText={(dueDate) => update({dueDate:dueDate || null})}/></View><View style={{flex:1}}><Field label="时间（可留空）" value={draft.dueTime ?? ''} placeholder="HH:mm" onChangeText={(dueTime) => update({dueTime:dueTime || null})}/></View></View>
    {(!draft.dueDate || !draft.dueTime) ? <Notice>日期或时间未确定时会保持留空；两项都确定后才能创建提醒。</Notice> : null}
    <Field label="预计专注分钟（可留空）" value={minutes} keyboardType="number-pad" placeholder="25" onChangeText={setMinutes} />
    <Label muted style={{fontSize:12,marginBottom:8}}>关联 AI 角色</Label><View style={[styles.wrap,{marginBottom:18}]}><Chip label="不关联" selected={!draft.personaId} onPress={() => update({personaId:null})}/>{data.personas.map((persona) => <Chip key={persona.id} label={persona.name} selected={draft.personaId===persona.id} onPress={() => update({personaId:persona.id})}/>)}</View>
    {error ? <Notice error>{error}</Notice> : null}<Button label={existing ? '保存修改' : '加入我的待办'} icon="checkmark" loading={saving} onPress={() => void save()} />
  </Sheet>;
}
