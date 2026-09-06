import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Navbar() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const tabs = ['Dashboard', 'History', 'Settings'];

  const handlePress = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'Dashboard') router.push('/');
    if (tab === 'History') router.push('/history');
    if (tab === 'Settings') router.push('/settings');
  };

  return (
    <View style={styles.navContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>SYSTEM</Text>
        <View style={styles.logoDot} />
      </View>

      <View style={styles.linksContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => handlePress(tab)}
            activeOpacity={0.7}
          >
            {activeTab === tab ? (
              <LinearGradient
                colors={['#a3e635', '#2dd4bf']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activePill}
              >
                <Text style={styles.activeText}>{tab}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactivePill}>
                <Text style={styles.inactiveText}>{tab}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
    zIndex: 10,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)', position: 'sticky', top: 0 },
    }),
  },
  logoContainer: { flexDirection: 'row', alignItems: 'baseline' },
  logoText: { fontSize: 20, fontWeight: '900', color: '#f8fafc', letterSpacing: 2 },
  logoDot: { width: 6, height: 6, backgroundColor: '#a3e635', borderRadius: 3, marginLeft: 4 },
  linksContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  inactivePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  activeText: { color: '#020617', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  inactiveText: { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
});