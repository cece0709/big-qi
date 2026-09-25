import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  return <Tabs screenOptions={{
    headerShown:false, sceneStyle:{ backgroundColor:colors.cream }, tabBarActiveTintColor:colors.green, tabBarInactiveTintColor:'#89958D',
    tabBarStyle:{ backgroundColor:'#FAFBF6',borderTopColor:'#E1E8DF',paddingTop:10,paddingBottom:bottom,height:65+bottom,elevation:0 },
    tabBarLabelStyle:{fontSize:10,marginTop:4,fontWeight:'600'}
  }}>
    <Tabs.Screen name="index" options={{ title:'聊天', tabBarIcon:({color,size}) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color}/> }} />
    <Tabs.Screen name="life" options={{ title:'生活', tabBarIcon:({color,size}) => <Ionicons name="leaf-outline" size={size} color={color}/> }} />
    <Tabs.Screen name="stats" options={{ title:'统计', tabBarIcon:({color,size}) => <Ionicons name="stats-chart-outline" size={size} color={color}/> }} />
    <Tabs.Screen name="profile" options={{ title:'我的', tabBarIcon:({color,size}) => <Ionicons name="person-outline" size={size} color={color}/> }} />
  </Tabs>;
}

