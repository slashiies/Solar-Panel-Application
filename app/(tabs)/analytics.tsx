import { LinearGradient } from 'expo-linear-gradient';
import { getApps, initializeApp } from 'firebase/app';
import { collection, getFirestore, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBhgDVccnxXHwMho86m_FiyXIHiMKkHwmM",
  authDomain: "solar-simulation-58769.firebaseapp.com",
  databaseURL: "https://solar-simulation-58769-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "solar-simulation-58769",
  storageBucket: "solar-simulation-58769.firebasestorage.app",
  messagingSenderId: "175895861897",
  appId: "1:175895861897:web:ebea9092b149f78b1cc458",
  measurementId: "G-7RSRK0T3RE"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default function AnalyticsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'live_telemetry'), orderBy('timestamp', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      let anomalyCount = 0;
      let totalV = 0, totalHz = 0, totalTHD = 0;
      let maxV = 0, minV = 999;
      let maxTHD = 0;
      
      const threatCounts: Record<string, number> = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const v = data.telemetry?.rms_voltage || 0;
        const hz = data.telemetry?.frequency || 0;
        const thd = data.telemetry?.thd_v || 0;

        totalV += v;
        totalHz += hz;
        totalTHD += thd;

        if (v > maxV) maxV = v;
        if (v < minV && v > 0) minV = v;
        if (thd > maxTHD) maxTHD = thd;

        if (data.analysis?.['System Status'] === 'ALARM') {
          anomalyCount++;
        }

        const disturbances = data.analysis?.Disturbances || [];
        if (Array.isArray(disturbances)) {
            disturbances.forEach((d: string) => {
                threatCounts[d] = (threatCounts[d] || 0) + 1;
            });
        }
      });

      const count = snapshot.size;
      const healthScore = Math.max(0, ((count - anomalyCount) / count) * 100).toFixed(1);

      setStats({
        total: count,
        anomalies: anomalyCount,
        healthScore: healthScore,
        avgV: (totalV / count).toFixed(1),
        maxV: maxV.toFixed(1),
        minV: minV === 999 ? "0.0" : minV.toFixed(1),
        avgHz: (totalHz / count).toFixed(2),
        avgTHD: (totalTHD / count).toFixed(2),
        maxTHD: maxTHD.toFixed(2),
        threats: threatCounts
      });
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || !stats) {
    return (
      <SafeAreaView style={[styles.center, {backgroundColor: '#0f172a'}]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00f2fe" />
        <Text style={styles.loadingText}>COMPILING DATASETS...</Text>
      </SafeAreaView>
    );
  }

  const healthColor = parseFloat(stats.healthScore) > 90 ? '#10b981' : parseFloat(stats.healthScore) > 75 ? '#f59e0b' : '#ef4444';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ANALYTICS</Text>
          <Text style={styles.subHeader}>Rolling 100-Tick Assessment</Text>
        </View>

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.glassCard}>
          <Text style={styles.cardTitleDark}>SYSTEM HEALTH SCORE</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.massiveValue, { color: healthColor }]}>{stats.healthScore}%</Text>
              <Text style={styles.statLabel}>OPTIMAL UPTIME</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.massiveValue, { color: stats.anomalies > 0 ? '#ef4444' : '#10b981' }]}>{stats.anomalies}</Text>
              <Text style={styles.statLabel}>TOTAL FAULTS</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={[styles.cardTitleDark, {marginLeft: 4, marginBottom: 12}]}>GRID AVERAGES & EXTREMES</Text>
        <View style={styles.grid}>
          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Avg Voltage</Text>
            <Text style={styles.value}>{stats.avgV} V</Text>
            <Text style={styles.subText}>Range: {stats.minV} - {stats.maxV}V</Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Avg Frequency</Text>
            <Text style={styles.value}>{stats.avgHz} Hz</Text>
            <Text style={styles.subText}>Target: 60.00 Hz</Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Avg THD</Text>
            <Text style={styles.value}>{stats.avgTHD}%</Text>
            <Text style={styles.subText}>Baseline Distortion</Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Max THD Peak</Text>
            <Text style={[styles.value, parseFloat(stats.maxTHD) > 5.0 ? {color: '#ef4444'} : {}]}>{stats.maxTHD}%</Text>
            <Text style={styles.subText}>Highest Recorded</Text>
          </LinearGradient>
        </View>

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.glassCard}>
          <Text style={styles.cardTitleDark}>THREAT DISTRIBUTION (TOP FAULTS)</Text>
          {Object.keys(stats.threats).length === 0 ? (
            <Text style={styles.optimalText}>Zero disturbances recorded in current window.</Text>
          ) : (
            Object.entries(stats.threats)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .map(([threat, count], index) => (
                <View key={index} style={styles.threatRow}>
                  <Text style={styles.threatName}>{threat}</Text>
                  <View style={styles.threatCountBadge}>
                    <Text style={styles.threatCountText}>{String(count)}</Text>
                  </View>
                </View>
              ))
          )}
        </LinearGradient>
        
        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#00f2fe', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  header: { marginTop: 60, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: 1 },
  subHeader: { fontSize: 14, color: '#94a3b8', fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  
  glassCard: { padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#1e293b' },
  cardTitleDark: { fontSize: 12, color: '#94a3b8', marginBottom: 16, fontWeight: '800', letterSpacing: 2 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statBox: { alignItems: 'center', flex: 1 },
  verticalDivider: { width: 1, height: '80%', backgroundColor: '#334155' },
  statLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  massiveValue: { fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '47%', padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  label: { fontSize: 11, color: '#94a3b8', letterSpacing: 1.5, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  value: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
  subText: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  threatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(51, 65, 85, 0.5)' },
  threatName: { color: '#cbd5e1', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  threatCountBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)' },
  threatCountText: { color: '#ef4444', fontWeight: '900', fontSize: 14 },
  optimalText: { color: '#10b981', fontStyle: 'italic', fontSize: 14, fontWeight: '600' }
});