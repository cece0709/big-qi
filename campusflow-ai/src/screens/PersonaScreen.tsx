import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createPersona, exportPersona, getMissingPersonaFields, preparePersonaImport, updatePersona } from '../core';
import type { PersonaCompletionField, Persona, PersonaInput } from '../core/types';
import type { PersonaImportDraft, PersonaMissingField } from '../core';
import { cancelReminder, exportJson, pickImage } from '../services/device';
import { Avatar, Background, Button, Card, Chip, Empty, Field, IconButton, Label, Notice, PageHeader, SectionTitle, Sheet, styles } from '../components/ui';
import { useApp } from '../state/AppProvider';

type PendingImport = Pick<PersonaImportDraft, 'draft' | 'missing'>;

const blank = (): PersonaInput => ({
  name: '', avatarUri: null, identity: '', background: '', personalityTags: [],
  speakingStyle: '温和、具体、尊重用户节奏', responseLength: 'medium', userNickname: '同学',
  greeting: '你好，我是一名 AI 助手。今天想从哪件小事开始？', dos: [], donts: [], pinnedMemories: [], isExample: false,
});
const split = (value: string) => value.replaceAll(String.fromCharCode(10), '、').split(/[、,，;；]/).map((item) => item.trim()).filter(Boolean);
const join = (items: string[]) => items.join('、');
const completionLabels: Record<PersonaCompletionField, string> = {
  name: '角色名称', identity: '一句话身份', background: '背景设定', personalityTags: '性格关键词',
  speakingStyle: '说话风格', userNickname: '对用户的称呼', greeting: '开场白',
  dos: '应该做的事', donts: '不应当做的事', pinnedMemories: '长期记忆',
};
function hasValue(value: unknown): boolean {
  return Array.isArray(value) ? value.some((item) => typeof item === 'string' && item.trim()) : typeof value === 'string' && Boolean(value.trim());
}
function pendingSummary(keys: PersonaCompletionField[]): string {
  return keys.map((key) => completionLabels[key]).join('、');
}

export default function PersonaScreen() {
  const { data, commit, confirm, run, toast } = useApp();
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<Persona | undefined>();
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importName, setImportName] = useState('');
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  const open = (persona?: Persona) => { setEditing(persona); setEditor(true); };
  const choose = (id: string) => run(async () => {
    await commit((current) => ({ ...current, settings: { ...current.settings, selectedPersonaId: id } }));
    toast('已切换 AI 角色');
  });
  const deletePersona = async (persona: Persona) => {
    if (data.personas.length <= 1) throw new Error('至少保留一个 AI 人设。');
    if (!await confirm(`删除 ${persona.name}？`, '该角色的聊天记录也会被删除，待办和专注记录会保留。')) return;
    const removesReminder = data.settings.personaNotificationPersonaId === persona.id;
    if (removesReminder) await cancelReminder(data.settings.personaNotificationId);
    await commit((current) => {
      const remaining = current.personas.filter((item) => item.id !== persona.id);
      const fallbackPersonaId = remaining[0]?.id ?? null;
      const ids = new Set(current.conversations.filter((item) => item.personaId === persona.id).map((item) => item.id));
      return {
        ...current,
        personas: remaining,
        conversations: current.conversations.filter((item) => item.personaId !== persona.id),
        messages: current.messages.filter((item) => !ids.has(item.conversationId)),
        settings: {
          ...current.settings,
          selectedPersonaId: current.settings.selectedPersonaId === persona.id ? fallbackPersonaId : current.settings.selectedPersonaId,
          personaNotificationsEnabled: removesReminder ? false : current.settings.personaNotificationsEnabled,
          personaNotificationPersonaId: removesReminder ? fallbackPersonaId : current.settings.personaNotificationPersonaId,
          personaNotificationId: removesReminder ? null : current.settings.personaNotificationId,
        },
      };
    });
    toast('人设已删除');
  };
  const clearChat = async (persona: Persona) => {
    if (!await confirm(`清除 ${persona.name} 的聊天？`, '只清除此角色的聊天记录。')) return;
    await commit((current) => {
      const ids = new Set(current.conversations.filter((item) => item.personaId === persona.id).map((item) => item.id));
      return { ...current, messages: current.messages.filter((item) => !ids.has(item.conversationId)), conversations: current.conversations.filter((item) => item.personaId !== persona.id) };
    });
    toast('聊天记录已清除');
  };
  const resetImport = () => { setImporting(false); setImportText(''); setImportName(''); };
  const pasteDocument = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) throw new Error('剪贴板中没有可粘贴的人设文字。');
    setImportText(text);
    toast('已粘贴文档，接下来会检查需要补充的设定。');
  };
  const saveImported = async (draft: PersonaInput, makeCurrent = false) => {
    const item = createPersona(draft);
    await commit((current) => ({
      ...current,
      personas: [...current.personas, item],
      settings: { ...current.settings, selectedPersonaId: makeCurrent ? item.id : current.settings.selectedPersonaId ?? item.id },
    }));
    setPendingImport(null);
    resetImport();
    toast(makeCurrent ? `已导入“${item.name}”，已设为当前 AI 角色。` : `已导入“${item.name}”。`);
  };
  const reviewImport = async () => {
    const result = preparePersonaImport(importText, { fallbackName: importName });
    if (!result.missing.length) { await saveImported(result.draft); return; }
    setPendingImport({ draft: result.draft, missing: result.missing });
    setImporting(false);
  };
  const updatePendingImport = (patch: Partial<PersonaInput>) => setPendingImport((current) => {
    if (!current) return current;
    const nextDraft = { ...current.draft, ...patch };
    const completion = nextDraft.completion ?? { pending: current.missing.map((field) => field.key), autoFromChat: false };
    const changed = new Set((Object.keys(patch) as PersonaCompletionField[]).filter((key) => hasValue(patch[key])));
    return { ...current, draft: { ...nextDraft, completion: { ...completion, pending: completion.pending.filter((key) => !changed.has(key)) } } };
  });
  const togglePendingAuto = () => setPendingImport((current) => {
    if (!current) return current;
    const completion = current.draft.completion ?? { pending: current.missing.map((field) => field.key), autoFromChat: false };
    return { ...current, draft: { ...current.draft, completion: { ...completion, autoFromChat: !completion.autoFromChat } } };
  });
  const confirmImported = async () => {
    if (!pendingImport) return;
    const completion = pendingImport.draft.completion ?? { pending: pendingImport.missing.map((field) => field.key), autoFromChat: false };
    await saveImported({ ...pendingImport.draft, completion: { ...completion, pending: [] } }, true);
  };
  const saveForLater = async () => { if (pendingImport) await saveImported(pendingImport.draft); };
  const startWithAutoCompletion = async () => {
    if (!pendingImport) return;
    const completion = pendingImport.draft.completion ?? { pending: pendingImport.missing.map((field) => field.key), autoFromChat: false };
    await saveImported({ ...pendingImport.draft, completion: { ...completion, autoFromChat: true } }, true);
  };

  return <Background theme={data.settings.theme} type={data.settings.backgroundType} uri={data.settings.backgroundUri}>
    <SafeAreaView edges={['top']} style={styles.fill}><ScrollView contentContainerStyle={styles.page}>
      <PageHeader eyebrow='AI, CLEARLY LABELED' title='AI 人设管理' subtitle='粘贴整篇人设文档，系统会识别已有设定并提示缺项。' action={<IconButton name='close' label='返回' onPress={() => router.back()} />}/>
      <Notice>每个角色都有独立聊天记录，并始终明确标注为 AI。完整文档会保留在本机的人设背景中。</Notice>
      <View style={[styles.wrap, { marginTop: 12 }]}>
        <Button label='创建人设' icon='add' onPress={() => open()} />
        <Button label='粘贴文档导入' variant='soft' icon='document-text-outline' onPress={() => setImporting(true)} />
      </View>
      <SectionTitle title='我的角色' detail={`${data.personas.length} 个`} />
      {data.personas.length ? data.personas.map((item) => {
        const pending = item.completion?.pending ?? [];
        return <Card key={item.id} style={{ marginBottom: 12, padding: 16 }}><View style={{ flexDirection: 'row', gap: 12 }}>
          <Avatar name={item.name} uri={item.avatarUri} size={52} />
          <View style={{ flex: 1 }}>
            <View style={styles.row}><Label style={{ fontSize: 16, fontWeight: '700' }}>{item.name} <Label style={{ fontSize: 11, color: '#28755F' }}>AI{item.isExample ? ' · 示例' : ''}</Label></Label>{data.settings.selectedPersonaId === item.id ? <Chip label='当前' selected /> : null}</View>
            <Label muted style={{ fontSize: 12, marginTop: 3 }}>{item.identity || '自定义 AI 行动伙伴'}</Label>
            {pending.length ? <View style={{ marginTop: 8 }}><Chip label={`待补全 ${pending.length} 项`} icon='create-outline' onPress={() => open(item)} /></View> : null}
            {item.completion?.autoFromChat ? <Label muted style={{ fontSize: 11, marginTop: 7 }}>互动中自动补全已开启</Label> : null}
            <View style={[styles.wrap, { marginTop: 10 }]}> 
              <Button label='切换' small variant='soft' onPress={() => choose(item.id)} />
              <Button label={pending.length ? '继续补全' : '编辑'} small variant='ghost' onPress={() => open(item)} />
              <Button label='导出' small variant='ghost' onPress={() => run(async () => { await exportJson(`campusflow-persona-${item.name}.json`, JSON.parse(exportPersona(item))); toast('人设已导出'); })} />
              <Button label='清聊天' small variant='ghost' onPress={() => run(() => clearChat(item))} />
              <Button label='删除' small variant='ghost' onPress={() => run(() => deletePersona(item))} />
            </View>
          </View>
        </View></Card>;
      }) : <Empty title='创建第一位 AI 伙伴' detail='填写身份、说话方式和界限，让它更贴合你的节奏。' action={<Button label='创建人设' onPress={() => open()} />}/>} 
    </ScrollView>
    <PersonaEditor visible={editor} persona={editing} onClose={() => setEditor(false)} />
    <Sheet visible={importing} title='粘贴人设文档' onClose={resetImport}>
      <Label muted style={{ fontSize: 12, marginBottom: 12 }}>直接粘贴 Word、备忘录、TXT 或 AI 模拟器的人设正文；不需要转成 JSON。</Label>
      <Field label='角色名称（可选）' value={importName} maxLength={40} placeholder='文档没有写名称时可在这里填写' onChangeText={setImportName} />
      <Field label='完整人设文档（不限字数）' value={importText} multiline placeholder='在这里粘贴完整文档…' onChangeText={setImportText} />
      <View style={[styles.wrap, { marginBottom: 8 }]}><Button label='从剪贴板粘贴' small variant='soft' icon='clipboard-outline' onPress={() => run(pasteDocument)} /></View>
      <Notice>系统会保留全文，并识别名称、身份、性格、说话风格、称呼、开场白、行为准则和长期记忆。文档没写的项目会在下一步集中提示。</Notice>
      <Button label='识别文档并检查缺项' icon='sparkles-outline' disabled={!importText.trim()} onPress={() => run(reviewImport)} />
    </Sheet>
    <Sheet visible={Boolean(pendingImport)} title='补齐人设设定' onClose={() => setPendingImport(null)}>
      {pendingImport ? <>
        <Notice>文档中没有找到：{pendingImport.missing.map((field) => field.label).join('、')}。你可以现在填写，或先开始聊天。</Notice>
        <MissingPersonaFields fields={pendingImport.missing} form={pendingImport.draft} onPatch={updatePendingImport} />
        <View style={{ marginBottom: 12 }}><Chip label='互动中自动补全未完成项' selected={pendingImport.draft.completion?.autoFromChat === true} icon='sparkles-outline' onPress={togglePendingAuto} /></View>
        <Notice>开启后，系统只会从你在聊天中明确写出的名称、身份、称呼或语气等设定补齐空项，不会改写原始文档或已有内容。</Notice>
        <Button label='保存并确认以上设定' icon='checkmark' onPress={() => run(confirmImported)} />
        <View style={{ marginTop: 8 }}><Button label='先开始互动，让系统补全' variant='soft' icon='chatbubble-ellipses-outline' onPress={() => run(startWithAutoCompletion)} /></View>
        <View style={{ marginTop: 4 }}><Button label='先保存，稍后手动补全' variant='ghost' onPress={() => run(saveForLater)} /></View>
      </> : null}
    </Sheet>
    </SafeAreaView>
  </Background>;
}

function MissingPersonaFields({ fields, form, onPatch }: { fields: PersonaMissingField[]; form: PersonaInput; onPatch: (patch: Partial<PersonaInput>) => void }) {
  return <>{fields.map((field) => {
    const label = `${field.label}${field.required ? '' : '（可选）'}`;
    if (field.key === 'name') return <Field key={field.key} label={label} value={form.name} maxLength={40} placeholder={field.hint} onChangeText={(name) => onPatch({ name })} />;
    if (field.key === 'identity') return <Field key={field.key} label={label} value={form.identity} maxLength={160} placeholder={field.hint} onChangeText={(identity) => onPatch({ identity })} />;
    if (field.key === 'background') return <Field key={field.key} label={`${label}（不限字数）`} value={form.background} multiline placeholder={field.hint} onChangeText={(background) => onPatch({ background })} />;
    if (field.key === 'speakingStyle') return <Field key={field.key} label={label} value={form.speakingStyle} multiline placeholder={field.hint} onChangeText={(speakingStyle) => onPatch({ speakingStyle })} />;
    if (field.key === 'userNickname') return <Field key={field.key} label={label} value={form.userNickname} maxLength={40} placeholder={field.hint} onChangeText={(userNickname) => onPatch({ userNickname })} />;
    if (field.key === 'greeting') return <Field key={field.key} label={label} value={form.greeting} multiline placeholder={field.hint} onChangeText={(greeting) => onPatch({ greeting })} />;
    if (field.key === 'personalityTags') return <Field key={field.key} label={label} value={join(form.personalityTags)} multiline placeholder={field.hint} onChangeText={(value) => onPatch({ personalityTags: split(value) })} />;
    if (field.key === 'dos') return <Field key={field.key} label={label} value={join(form.dos)} multiline placeholder={field.hint} onChangeText={(value) => onPatch({ dos: split(value) })} />;
    if (field.key === 'donts') return <Field key={field.key} label={label} value={join(form.donts)} multiline placeholder={field.hint} onChangeText={(value) => onPatch({ donts: split(value) })} />;
    return <Field key={field.key} label={label} value={join(form.pinnedMemories)} multiline placeholder={field.hint} onChangeText={(value) => onPatch({ pinnedMemories: split(value) })} />;
  })}</>;
}

function PersonaEditor({ visible, persona, onClose }: { visible: boolean; persona?: Persona; onClose: () => void }) {
  const { commit, toast } = useApp();
  const [form, setForm] = useState<PersonaInput>(blank());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (visible) { setError(''); setForm(persona ? { ...persona } : blank()); } }, [visible, persona]);
  const patch = (next: Partial<PersonaInput>) => setForm((current) => ({ ...current, ...next }));
  const pending = form.completion?.pending ?? getMissingPersonaFields(form).map((field) => field.key);
  const autoFromChat = form.completion?.autoFromChat === true;
  const toggleAuto = () => patch({ completion: { pending, autoFromChat: !autoFromChat } });
  const save = async () => {
    setSaving(true); setError('');
    try {
      const next = persona ? updatePersona(persona, form) : createPersona(form);
      await commit((current) => ({
        ...current,
        personas: persona ? current.personas.map((item) => item.id === persona.id ? next : item) : [...current.personas, next],
        settings: { ...current.settings, selectedPersonaId: current.settings.selectedPersonaId ?? next.id },
      }));
      toast(persona ? '人设已更新' : 'AI 人设已创建');
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  };
  const chooseAvatar = async () => { const uri = await pickImage(); if (uri) patch({ avatarUri: uri }); };
  return <Sheet visible={visible} title={persona ? '编辑 AI 人设' : '创建 AI 人设'} onClose={onClose}>
    <View style={{ alignItems: 'center', marginBottom: 16 }}><Pressable accessibilityRole='button' onPress={() => void chooseAvatar()}><Avatar name={form.name || 'AI'} uri={form.avatarUri} size={75} /></Pressable><Button label='选择头像' small variant='ghost' onPress={() => void chooseAvatar()} /></View>
    {pending.length ? <Notice>还有 {pending.length} 项设定尚未确认：{pendingSummary(pending)}。可以手动补齐，或允许系统在互动中补齐。</Notice> : <Notice>这份人设的主要设定已经完成。你仍可按需允许互动中自动补全。</Notice>}
    <View style={{ marginBottom: 14 }}><Chip label='互动中自动补全未完成项' selected={autoFromChat} icon='sparkles-outline' onPress={toggleAuto} /></View>
    <Field label='角色名称' value={form.name} maxLength={40} placeholder='例如：知夏' onChangeText={(name) => patch({ name })} />
    <Field label='一句话身份' value={form.identity} maxLength={160} placeholder='例如：把大目标拆成小步骤的 AI 学习搭子' onChangeText={(identity) => patch({ identity })} />
    <Field label='背景介绍（不限字数）' value={form.background} multiline onChangeText={(background) => patch({ background })} />
    <Field label='性格关键词（用顿号或换行分隔）' value={join(form.personalityTags)} onChangeText={(value) => patch({ personalityTags: split(value) })} />
    <Field label='说话风格' value={form.speakingStyle} multiline onChangeText={(speakingStyle) => patch({ speakingStyle })} />
    <Label muted style={{ fontSize: 12, marginBottom: 8 }}>回复长度</Label>
    <View style={[styles.wrap, { marginBottom: 16 }]}>{([{ id: 'short', name: '简短' }, { id: 'medium', name: '适中' }, { id: 'long', name: '详细' }] as const).map((item) => <Chip key={item.id} label={item.name} selected={form.responseLength === item.id} onPress={() => patch({ responseLength: item.id })} />)}</View>
    <Field label='对用户的称呼' value={form.userNickname} maxLength={40} onChangeText={(userNickname) => patch({ userNickname })} />
    <Field label='开场白' value={form.greeting} multiline onChangeText={(greeting) => patch({ greeting })} />
    <Field label='应该做的事（顿号或换行分隔）' value={join(form.dos)} multiline onChangeText={(value) => patch({ dos: split(value) })} />
    <Field label='不应当做的事（顿号或换行分隔）' value={join(form.donts)} multiline onChangeText={(value) => patch({ donts: split(value) })} />
    <Field label='长期记忆（顿号或换行分隔）' value={join(form.pinnedMemories)} multiline onChangeText={(value) => patch({ pinnedMemories: split(value) })} />
    {error ? <Notice error>{error}</Notice> : null}
    <Button label={persona ? '保存修改' : '创建 AI 人设'} icon='checkmark' loading={saving} onPress={() => void save()} />
  </Sheet>;
}