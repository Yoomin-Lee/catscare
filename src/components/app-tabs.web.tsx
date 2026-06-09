import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type TabConfig = {
  name: string;
  href: string;
  label: string;
  iconName: string;
  iconLib: 'Feather' | 'FontAwesome5';
  iconSize?: number;
}

const TABS: TabConfig[] = [
  { name: 'alarm',    href: '/',         label: '주기 알람',   iconName: 'bell',       iconLib: 'Feather' },
  { name: 'hospital', href: '/hospital', label: '병원 기록',   iconName: 'clipboard',  iconLib: 'Feather' },
  { name: 'home',     href: '/home',     label: '홈',          iconName: 'home',        iconLib: 'Feather', iconSize: 22 },
  { name: 'body',     href: '/body',     label: '체중/투약',   iconName: 'activity',   iconLib: 'Feather' },
  { name: 'food',     href: '/food',     label: '식단/기호성', iconName: 'coffee',     iconLib: 'Feather' },
];

export default function AppTabs() {
  return (
    <Tabs style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoIcon}>
          <FontAwesome5 name="cat" size={21} color="#E9785A" />
        </View>
        <Text style={styles.brand}>CatsCare</Text>
      </View>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton tab={tab}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, tab, ...props }: TabTriggerSlotProps & { tab: TabConfig }) {
  const color = isFocused ? '#E9785A' : '#aaa';
  const size = tab.iconSize ?? 20;
  const Icon = tab.iconLib === 'Feather' ? Feather : FontAwesome5;
  return (
    <Pressable {...props} style={[styles.tabButton, tab.name === 'home' && styles.tabButtonHome]}>
      {tab.name === 'home' && isFocused && <View style={styles.homeActiveBg} />}
      <Icon name={tab.iconName as any} size={size} color={color} />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
        {children as string}
      </Text>
      {tab.name !== 'home' && isFocused && <View style={styles.activeBar} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#E5E5E5', backgroundColor: '#fff',
  },
  logoIcon: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  brand: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', lineHeight: 22 },
  slot: { flex: 1 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E5E5E5', paddingBottom: 8,
  },
  tabButton: {
    flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 4,
    position: 'relative',
  },
  tabButtonHome: {
    flex: 1.2,
  },
  homeActiveBg: {
    position: 'absolute', top: 4, left: '20%', right: '20%', bottom: 4,
    backgroundColor: '#FAECE7', borderRadius: 12,
  },
  tabLabel: { fontSize: 10, color: '#aaa', fontWeight: '500', marginTop: 3 },
  tabLabelActive: { color: '#E9785A', fontWeight: '700' },
  activeBar: {
    position: 'absolute', top: 0, left: '25%', right: '25%',
    height: 2, backgroundColor: '#E9785A', borderRadius: 1,
  },
});
