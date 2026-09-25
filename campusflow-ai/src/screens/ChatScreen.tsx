import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAIProvider } from '../ai';
import { completePersonaFromInteraction, extractTaskLocally, getMissingPersonaFields, makeId } from '../core';
import type { Conversation, Message, Persona, PersonaCompletionField, TaskDraft } from '../core/types';
import { TaskEditor } from '../components/TaskEditor';
import { Avatar, Background, Button, Card, Chip, Empty, Icon, IconButton, Label, Notice, PageHeader, Sheet, colors, styles } from '../components/ui';
import { useApp } from '../state/AppProvider';

const personaFieldLabels: Record<PersonaCompletionField, string> = {
  name: '角色名称', identity: '一句话身份', background: '背景设定', personalityTags: '性格关键词',
  speakingStyle: '说话风格', userNickname: '对用户的称呼', greeting: '开场白',
  dos: '应该做的事', donts: '不应当做的事', pinnedMemories: '长期记忆',
};

export default function ChatScreen() {
  const { data, commit, confirm, run, toast } = useApp();
  const [input, setInput] = useState(''); const [chooser, setChooser] = useState(false); const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [taskVisible, setTaskVisible] = useState(false); const [extracting, setExtracting] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const persona = data.personas.find((item) => item.id === data.settings.selectedPersonaId) ?? data.personas[0];
  const pendingPersonaFields = persona ? (persona.completion?.pending ?? getMissingPersonaFields(persona).map((field) => field.key)) : [];
  const personaAutoCompletionEnabled = persona?.completion?.autoFromChat === true;
  const conversation = persona ? data.conversations.find((item) => item.personaId===persona.id) : undefined;
  const messages = useMemo(() => conversation ? data.messages.filter((item) => item.conversationId===conversation.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)) : [], [conversation, data.messages]);
  const switchPersona = async (next:Persona) => { abortRef.current?.abort(); await commit((current) => ({...current,settings:{...current.settings,selectedPersonaId:next.id}})); setChooser(false); };
  const ensureConversation = (current:Persona):Conversation => conversation ?? { id:makeId('conversation'), personaId:current.id, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  const completePersonaAfterReply = async (personaId:string, userText:string) => {
    let changed:PersonaCompletionField[] = [];
    await commit((state) => {
      const latest = state.personas.find((item) => item.id === personaId);
      if (!latest) return state;
      const result = completePersonaFromInteraction(latest, userText);
      if (!result.changed.length) return state;
      changed = result.changed;
      return { ...state, personas:state.personas.map((item) => item.id === personaId ? result.persona : item) };
    });
    if (changed.length) toast(`已根据本次互动补全人设：${changed.map((field) => personaFieldLabels[field]).join('、')}`);
  };
  const generate = async (current:Persona, currentConversation:Conversation, history:Message[], userMessage:Message) => {
    abortRef.current?.abort(); const controller=new AbortController(); abortRef.current=controller;
    const assistant:Message={id:makeId('message'),conversationId:currentConversation.id,role:'assistant',content:'',createdAt:new Date().toISOString(),status:'streaming'};
    await commit((state) => ({...state,messages:[...state.messages,assistant],conversations:state.conversations.some((item)=>item.id===currentConversation.id)?state.conversations.map((item)=>item.id===currentConversation.id?{...item,updatedAt:new Date().toISOString()}:item):[...state.conversations,currentConversation]}));
    const provider=createAIProvider({mode:data.settings.aiMode});
    try {
      for await (const event of provider.streamChat({persona:current,messages:[...history,userMessage].filter((item)=>item.status!=='error').map((item)=>({role:item.role,content:item.content})),signal:controller.signal})) {
        if (event.type==='delta') await commit((state) => ({...state,messages:state.messages.map((item)=>item.id===assistant.id?{...item,content:item.content+event.text,status:'streaming'}:item)}));
        if (event.type==='done') {
          await commit((state) => ({...state,messages:state.messages.map((item)=>item.id===assistant.id?{...item,status:'sent'}:item)}));
          try { await completePersonaAfterReply(current.id, userMessage.content); }
          catch (reason) { toast(reason instanceof Error ? `人设自动完善未保存：${reason.message}` : '人设自动完善未保存'); }
        }
        if (event.type==='error') await commit((state) => ({...state,messages:state.messages.map((item)=>item.id===assistant.id?{...item,status:'error',error:event.message,content:item.content||'回复暂时未生成'}:item)}));
      }
    } catch (reason) {
      if ((reason as Error).name==='AbortError') return;
      await commit((state) => ({...state,messages:state.messages.map((item)=>item.id===assistant.id?{...item,status:'error',error:'网络连接中断，请重新发送',content:item.content||'回复暂时未生成'}:item)}));
    } finally { if (abortRef.current===controller) abortRef.current=null; }
  };
  const send = async () => {
    const text=input.trim(); if(!text) return; if(!persona){toast('请先创建一个 AI 人设');return;} if(text.length>4000){toast('消息不能超过 4000 字');return;}
    const nextConversation=ensureConversation(persona); const user:Message={id:makeId('message'),conversationId:nextConversation.id,role:'user',content:text,createdAt:new Date().toISOString(),status:'sent'};
    setInput(''); await commit((state)=>({...state,messages:[...state.messages,user],conversations:state.conversations.some((item)=>item.id===nextConversation.id)?state.conversations.map((item)=>item.id===nextConversation.id?{...item,updatedAt:new Date().toISOString()}:item):[...state.conversations,nextConversation]}));
    await generate(persona,nextConversation,messages,user);
  };
  const regenerate = async (assistant:Message) => {
    if(!persona || !conversation) return; const index=messages.findIndex((item)=>item.id===assistant.id); const prior=[...messages.slice(0,index)]; const user=[...prior].reverse().find((item)=>item.role==='user');
    if(!user) return; await commit((state)=>({...state,messages:state.messages.filter((item)=>item.id!==assistant.id)})); await generate(persona,conversation,prior.filter((item)=>item.id!==user.id && (item.role!=='assistant'||item.status==='sent')),user);
  };
  const deleteMessage = async (message:Message) => {
    if(!await confirm('删除这条消息？','此操作只影响当前角色的聊天记录。'))return;
    await commit((state)=>({...state,messages:state.messages.filter((item)=>item.id!==message.id)}));
  };
  const toTask = async (message:Message) => {
    if(!persona) return; setExtracting(message.id);
    try { const provider=createAIProvider({mode:data.settings.aiMode}); const draft=await provider.extractTask({text:message.content}); setTaskDraft({...draft,personaId:persona.id,sourceMessageId:message.id});setTaskVisible(true); }
    catch (reason) { const fallback=extractTaskLocally(message.content);setTaskDraft({...fallback,personaId:persona.id,sourceMessageId:message.id});setTaskVisible(true);toast(reason instanceof Error ? `AI 提取不可用，已使用本地规则：${reason.message}`:'已使用本地规则提取任务'); }
    finally {setExtracting(null);}
  };
  const clear = async () => { if(!conversation || !await confirm('清空当前对话？','只清除此 AI 人设的聊天记录，待办与专注记录不会受影响。'))return; abortRef.current?.abort();await commit((state)=>({...state,messages:state.messages.filter((item)=>item.conversationId!==conversation.id)}));toast('当前对话已清空'); };
  if(!persona) return <Background><SafeAreaView edges={['top']} style={styles.fill}><View style={styles.page}><PageHeader eyebrow="YOUR AI COMPANION" title="先认识一下" subtitle="创建一个明确标注为 AI 的行动伙伴。"/><Empty title="还没有 AI 人设" detail="从示例开始，或创建一个属于你的角色。" action={<Button label="管理 AI 人设" onPress={()=>router.push('/personas')} />}/></View></SafeAreaView></Background>;
  return <Background theme={data.settings.theme} type={data.settings.backgroundType} uri={data.settings.backgroundUri}>
    <SafeAreaView edges={['top']} style={styles.fill}><View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><PageHeader eyebrow={data.settings.aiMode==='mock'?'MOCK AI · 本地演示':'AI COMPANION'} title={persona.name} subtitle={persona.identity} action={<IconButton name="people-outline" label="切换角色" onPress={()=>setChooser(true)}/>}/>
        <Card style={{backgroundColor:'rgba(239,246,235,.76)',padding:15}}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Avatar name={persona.name} uri={persona.avatarUri}/><View style={{flex:1}}><Label style={{fontSize:13,fontWeight:'700'}}>{persona.name}<Text style={{fontSize:11,color:colors.green}}> · AI</Text></Label><Label muted style={{fontSize:12}}>{persona.speakingStyle || '温和、清晰地帮你行动'}</Label></View><IconButton name="settings-outline" label="管理人设" onPress={()=>router.push('/personas')}/></View></Card>
        <Notice>内容由 AI 生成，请自行判断。不要把 AI 的回复当作医疗、法律或投资结论。</Notice>
        {pendingPersonaFields.length ? <Card style={{padding:13,marginTop:2,backgroundColor:'rgba(255,255,255,.78)'}}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={{flex:1,gap:4}}><Label style={{fontSize:13,fontWeight:'700'}}>人设还有 {pendingPersonaFields.length} 项待完善</Label><Label muted style={{fontSize:12}}>{pendingPersonaFields.map((field)=>personaFieldLabels[field]).join('、')}</Label><Label muted style={{fontSize:12}}>{personaAutoCompletionEnabled ? '互动自动完善已开启；回复完成后会从你明确写下的设定中补齐。' : '可到人设管理中补充，或开启互动自动完善。'}</Label></View><Button label="去完善" small variant="soft" onPress={()=>router.push('/personas')}/></View></Card> : null}
        {messages.length===0 ? <View style={{paddingTop:28}}><Empty icon="chatbubble-ellipses-outline" title={persona.greeting || `你好，我是 ${persona.name}`} detail="说说你今天想推进的事，我会帮你拆成一个小而清楚的开始。" /><View style={[styles.wrap,{justifyContent:'center'}]}><Chip label="帮我安排今天" onPress={()=>setInput('帮我安排今天的学习和休息')}/><Chip label="转成待办" onPress={()=>setInput('明天下午三点复习高数一小时')}/></View></View> : <View style={{paddingTop:18,gap:12}}>{messages.map((message)=><MessageBubble key={message.id} message={message} persona={persona} extracting={extracting===message.id} onCopy={()=>run(async()=>{await Clipboard.setStringAsync(message.content);toast('已复制消息');})} onDelete={()=>run(()=>deleteMessage(message))} onTask={()=>run(()=>toTask(message))} onRegenerate={()=>run(()=>regenerate(message))}/>)}</View>}
        {messages.length ? <View style={{marginTop:18,alignItems:'center'}}><Button label="清空当前对话" small variant="ghost" onPress={()=>run(clear)}/></View> : null}
      </ScrollView>
      <View style={{padding:14,paddingTop:8,borderTopWidth:1,borderTopColor:'rgba(220,230,219,.8)',backgroundColor:'rgba(248,248,242,.87)'}}><View style={[styles.input,{flexDirection:'row',alignItems:'flex-end',paddingVertical:6,paddingRight:6,gap:8}]}><TextInput accessibilityLabel="聊天输入框" value={input} onChangeText={setInput} placeholder={`和 ${persona.name} 说点什么…`} placeholderTextColor="#87978D" multiline maxLength={4000} style={{flex:1,maxHeight:108,paddingHorizontal:10,paddingVertical:8,fontSize:14,color:colors.ink}}/><Pressable accessibilityRole="button" accessibilityLabel="发送消息" onPress={()=>run(send)} style={{height:40,width:40,borderRadius:14,backgroundColor:input.trim()?colors.green:'#D5DED3',alignItems:'center',justifyContent:'center'}}><Icon name="arrow-up" color="#fff" size={20}/></Pressable></View></View>
    </View>
    <Sheet visible={chooser} title="切换 AI 角色" onClose={()=>setChooser(false)}>{data.personas.map((item)=><Pressable key={item.id} accessibilityRole="button" onPress={()=>run(()=>switchPersona(item))} style={{paddingVertical:13,borderBottomWidth:1,borderBottomColor:colors.line}}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Avatar name={item.name} uri={item.avatarUri}/><View style={{flex:1}}><Label style={{fontWeight:'700'}}>{item.name}{item.isExample?' · 示例':''}</Label><Label muted style={{fontSize:12}}>{item.identity}</Label></View>{item.id===persona.id?<Icon name="checkmark-circle" color={colors.green}/>:<Icon name="chevron-forward" color={colors.muted}/>}</View></Pressable>)}<View style={{marginTop:16}}><Button label="管理 AI 人设" variant="soft" icon="settings-outline" onPress={()=>{setChooser(false);router.push('/personas');}}/></View></Sheet>
    <TaskEditor visible={taskVisible} initial={taskDraft} onClose={()=>setTaskVisible(false)}/>
  </SafeAreaView>
  </Background>;
}
function MessageBubble({message,persona,extracting,onCopy,onDelete,onTask,onRegenerate}:{message:Message;persona:Persona;extracting:boolean;onCopy:()=>void;onDelete:()=>void;onTask:()=>void;onRegenerate:()=>void}) {
  const user=message.role==='user';
  return <View style={{alignItems:user?'flex-end':'flex-start'}}><View style={{maxWidth:'88%',flexDirection:'row',gap:8,alignItems:'flex-end'}}>{!user?<Avatar name={persona.name} uri={persona.avatarUri} size={30}/>:null}<Pressable accessibilityRole="button" onLongPress={onTask} style={{borderRadius:18,paddingHorizontal:14,paddingVertical:11,backgroundColor:user?colors.ink:'rgba(255,255,255,.82)',borderBottomRightRadius:user?4:18,borderBottomLeftRadius:user?18:4}}><Text selectable style={{fontSize:14,lineHeight:22,color:user?'#fff':colors.ink}}>{message.content || '正在思考…'}</Text>{message.status==='streaming'?<Label muted style={{fontSize:11,marginTop:5}}>正在生成…</Label>:null}{message.status==='error'?<Label style={{fontSize:11,color:colors.red,marginTop:5}}>{message.error ?? '发送失败'}</Label>:null}</Pressable></View>
    <View style={{flexDirection:'row',gap:2,marginTop:4,marginHorizontal:user?0:38}}><Button label="复制" small variant="ghost" onPress={onCopy}/><Button label={extracting?'提取中…':'转为待办'} small variant="ghost" onPress={onTask} disabled={extracting}/>{!user && (message.status==='error'||message.status==='sent')?<Button label="重试" small variant="ghost" onPress={onRegenerate}/>:null}<Button label="删除" small variant="ghost" onPress={onDelete}/></View>
  </View>;
}



