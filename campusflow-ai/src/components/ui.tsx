import React from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const colors = {
  ink: '#1E3B34', muted: '#667870', green: '#28755F', mint: '#E0EEE2',
  cream: '#F8F7F1', line: '#DCE6DB', white: '#FFFFFF', coral: '#B35D4A',
  red: '#AD4646', peach: '#F3E3D6'
};
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Label({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.text, muted && { color: colors.muted }, style]}>{children}</Text>;
}
export function Avatar({ uri, name, size = 46 }: { uri?: string | null; name: string; size?: number }) {
  if (uri && !uri.startsWith('symbol:')) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size * .34 }} />;
  const sunny = name.includes('满') || name.includes('野');
  return <View style={{ width:size, height:size, borderRadius:size*.34, backgroundColor:sunny ? '#F2DEC9' : '#D9E8DB', alignItems:'center', justifyContent:'center' }}>
    <Icon name={sunny ? 'sunny-outline' : 'leaf-outline'} size={size*.48} color={colors.green} />
  </View>;
}
export function Button({ label, onPress, icon, variant = 'primary', disabled = false, loading = false, small = false }: {
  label: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'soft' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; small?: boolean;
}) {
  const textColor = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.red : colors.ink;
  const bg = variant === 'primary' ? colors.green : variant === 'soft' ? '#E7EFE5' : variant === 'danger' ? '#F8EAE7' : 'transparent';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor:bg }, small && styles.smallButton, (disabled || loading) && { opacity:.48 }, pressed && { opacity:.72 }]}>
    {loading ? <ActivityIndicator color={textColor} /> : icon ? <Icon name={icon} size={small ? 16 : 19} color={textColor} /> : null}
    <Text style={{ color:textColor, fontSize:small ? 12 : 14, fontWeight:'600' }}>{label}</Text>
  </Pressable>;
}
export function IconButton({ name, label, onPress, disabled = false }: { name: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, { opacity:disabled ? .35 : pressed ? .55 : 1 }]}><Icon name={name} /></Pressable>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <View style={{ paddingTop:17, paddingBottom:22 }}>
    <Text style={styles.eyebrow}>{eyebrow}</Text>
    <View style={styles.row}><Text style={styles.title}>{title}</Text>{action}</View>
    {subtitle ? <Label muted style={{ marginTop:8 }}>{subtitle}</Label> : null}
  </View>;
}
export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return <View style={[styles.row, { marginTop:22, marginBottom:12 }]}><Text style={styles.sectionTitle}>{title}</Text>{detail ? <Label muted style={{fontSize:12}}>{detail}</Label> : null}</View>;
}
export function Chip({ label, selected = false, onPress, icon }: { label:string; selected?:boolean; onPress?:() => void; icon?:IconName }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
    {icon ? <Icon name={icon} size={14} color={selected ? '#fff' : colors.muted} /> : null}<Text style={{ color:selected ? '#fff' : colors.muted, fontSize:12, fontWeight:'600' }}>{label}</Text>
  </Pressable>;
}
export function Segments({ options, value, onChange }: { options: readonly string[]; value:string; onChange:(v:string)=>void }) {
  return <View style={styles.segments}>{options.map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityState={{selected:value===option}} onPress={() => onChange(option)} style={[styles.segment, value===option && styles.segmentSelected]}>
    <Text style={{fontSize:14,fontWeight:'600',color:value===option ? colors.ink : colors.muted}}>{option}</Text>
  </Pressable>)}</View>;
}
export function Field({ label, error, ...props }: TextInputProps & { label:string; error?:string }) {
  return <View style={{ gap:7, marginBottom:16 }}><Text style={styles.fieldLabel}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#87978D" {...props} style={[styles.input, props.multiline && { minHeight:92, textAlignVertical:'top' }, props.style]} />
    {error ? <Text style={{color:colors.red,fontSize:12}}>{error}</Text> : null}
  </View>;
}
export function Empty({ icon='leaf-outline', title, detail, action }: { icon?:IconName; title:string; detail:string; action?:React.ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Icon name={icon} size={29} color={colors.green}/></View><Text style={styles.sectionTitle}>{title}</Text><Label muted style={{textAlign:'center',maxWidth:290}}>{detail}</Label>{action}</View>;
}
export function Notice({ children, error = false }: { children:React.ReactNode; error?:boolean }) {
  return <View style={{backgroundColor:error ? '#F9EBE9' : '#EAF1E8',padding:13,borderRadius:14,flexDirection:'row',gap:8,marginVertical:8}}>
    <Icon name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={17} color={error ? colors.red : colors.green}/><Text style={{fontSize:12,lineHeight:19,color:error ? colors.red : colors.muted,flex:1}}>{children}</Text>
  </View>;
}
export function Sheet({ visible, title, onClose, children }: { visible:boolean; title:string; onClose:()=>void; children:React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.modalOverlay}>
      <Pressable accessibilityLabel="关闭弹窗" onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,20)}]}><View style={[styles.row,{paddingBottom:12}]}><Text style={styles.sectionTitle}>{title}</Text><IconButton name="close" label="关闭" onPress={onClose}/></View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export function Background({ children, theme='mint', type='gradient', uri }: { children:React.ReactNode; theme?:string; type?:string; uri?:string|null }) {
  const palette: [string, string, string] = theme==='lavender' ? ['#EFEAF5','#F8F6F1','#E9EEF3'] : theme==='peach' ? ['#F7EBE0','#FAF7EF','#E9EFE1'] : ['#E2EDE1','#F8F7F1','#EDF1E5'];
  const inner = <LinearGradient colors={type==='solid' ? ['#F7F8F2','#F7F8F2'] as [string,string] : palette} style={styles.fill}>{children}</LinearGradient>;
  return type==='image' && uri ? <ImageBackground source={{uri}} style={styles.fill}><View style={[styles.fill,{backgroundColor:'rgba(248,249,243,.85)'}]}>{children}</View></ImageBackground> : inner;
}
export const styles = StyleSheet.create({
  fill:{flex:1}, page:{paddingHorizontal:22,paddingBottom:28,width:'100%',maxWidth:720,alignSelf:'center'},
  text:{fontSize:14,lineHeight:22,color:colors.ink}, row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}, wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
  eyebrow:{fontSize:10,letterSpacing:2.2,fontWeight:'700',color:colors.green,marginBottom:8}, title:{fontSize:29,fontWeight:'700',letterSpacing:-.7,color:colors.ink,flexShrink:1}, sectionTitle:{fontSize:17,fontWeight:'700',color:colors.ink},
  card:{backgroundColor:'rgba(255,255,255,.76)',borderWidth:1,borderColor:'rgba(255,255,255,.9)',borderRadius:23,padding:19,shadowColor:'#264A3A',shadowOpacity:.045,shadowRadius:12,shadowOffset:{width:0,height:4}},
  button:{minHeight:46,paddingVertical:12,paddingHorizontal:18,borderRadius:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}, smallButton:{minHeight:38,paddingVertical:8,paddingHorizontal:12},
  iconButton:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:'rgba(255,255,255,.52)'},
  chip:{paddingVertical:9,paddingHorizontal:13,borderRadius:20,borderWidth:1,borderColor:'#D8E3D8',backgroundColor:'rgba(255,255,255,.54)',flexDirection:'row',alignItems:'center',gap:5}, chipSelected:{backgroundColor:colors.ink,borderColor:colors.ink},
  segments:{flexDirection:'row',padding:5,borderRadius:17,backgroundColor:'#E7EDE4',gap:4,marginBottom:18},segment:{flex:1,paddingVertical:11,borderRadius:13,alignItems:'center'},segmentSelected:{backgroundColor:'#fff',shadowColor:'#21382C',shadowOpacity:.06,shadowRadius:4,shadowOffset:{width:0,height:1}},
  fieldLabel:{fontSize:12,fontWeight:'600',color:colors.muted},input:{borderWidth:1,borderColor:'#DCE5DB',backgroundColor:'rgba(255,255,255,.85)',borderRadius:14,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:colors.ink,minHeight:46},
  empty:{alignItems:'center',paddingVertical:35,gap:12},emptyIcon:{width:67,height:67,borderRadius:24,backgroundColor:'#E4EDE1',alignItems:'center',justifyContent:'center',marginBottom:5},
  modalOverlay:{flex:1,backgroundColor:'rgba(28,45,35,.28)',justifyContent:'flex-end',alignItems:'center'},sheet:{backgroundColor:'#F7F8F2',borderTopLeftRadius:28,borderTopRightRadius:28,padding:22,width:'100%',maxWidth:720,maxHeight:'92%'},
  divider:{height:1,backgroundColor:'#E4E9E0',marginVertical:16}
});

