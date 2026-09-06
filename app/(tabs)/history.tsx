import { LinearGradient } from 'expo-linear-gradient';
import { getApps, initializeApp } from 'firebase/app';
import { collection, getFirestore, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

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
const screenWidth = Dimensions.get("window").width;

export default function HistoryTab() {
  const [historyLog, setHistoryLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'live_telemetry'), orderBy('timestamp', 'desc'), limit(60));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHistoryLog(docs);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading || historyLog.length === 0) {
    return (
      <SafeAreaView style={[styles.center, {backgroundColor: '#0f172a'}]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00f2fe" />
        <Text style={styles.loadingText}>ACCESSING ARCHIVES...</Text>
      </SafeAreaView>
    );
  }

  const chartData = [...historyLog].reverse();

  const voltageData = {
    labels: chartData.map((_, index) => index.toString()),
    datasets: [
      {
        data: chartData.map(h => h.telemetry?.rms_voltage || 0),
        color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
        strokeWidth: 2,
        withDots: false
      }
    ]
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SYSTEM LOGS</Text>
          <Text style={styles.subHeader}>Historical Data Archive</Text>
        </View>

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.glassCard}>
          <Text style={styles.cardTitleDark}>RECENT VOLTAGE TREND</Text>
          <LineChart
            data={voltageData}
            width={screenWidth - 56} 
            height={200} 
            chartConfig={{
              backgroundColor: "transparent",
              backgroundGradientFrom: "#1e293b",
              backgroundGradientFromOpacity: 0,
              backgroundGradientTo: "#0f172a",
              backgroundGradientToOpacity: 0,
              color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
              strokeWidth: 2,
              useShadowColorFromDataset: true,
              decimalPlaces: 2,
              propsForDots: { r: "0" }
            }}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={true}
            yAxisLabel=""
            yAxisSuffix=""
          />
        </LinearGradient>

        <Text style={[styles.cardTitleDark, {marginLeft: 4, marginBottom: 12}]}>AUDIT TRAIL</Text>
        
        {historyLog.map((log, index) => {
          const timeString = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'Just now';
          const isAlarm = log.analysis?.['System Status'] === "ALARM";
          
          return (
            <LinearGradient 
              key={log.id || index}
              colors={isAlarm ? ['#450a0a', '#1e293b'] : ['#1e293b', '#0f172a']} 
              style={[styles.logItem, isAlarm ? {borderColor: '#991b1b', borderWidth: 1} : {}]}
            >
              <View style={styles.logRow}>
                <Text style={styles.logTime}>{timeString}</Text>
                <Text style={[styles.logStatus, {color: isAlarm ? '#ef4444' : '#10b981'}]}>
                  {log.analysis?.['System Status']}
                </Text>
              </View>
              
              <View style={styles.logRow}>
                <Text style={styles.logDetail}>Voltage: <Text style={{fontWeight: 'bold', color: '#f8fafc'}}>{log.telemetry?.rms_voltage?.toFixed(2)}V</Text></Text>
                <Text style={styles.logDetail}>Load: <Text style={{fontWeight: 'bold', color: '#f8fafc'}}>{log.analysis?.['Predicted Next Load (kW)']} kW</Text></Text>
              </View>

              {isAlarm && (
                <Text style={styles.logWarning}>⚠️ {log.analysis?.Disturbances}</Text>
              )}
            </LinearGradient>
          );
        })}

        <View style={{height: 60}} /> 
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
  chart: { marginVertical: 0, borderRadius: 16, alignSelf: 'center', marginLeft: -15 },
  
  logItem: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  logTime: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  logStatus: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  logDetail: { color: '#cbd5e1', fontSize: 14 },
  logWarning: { color: '#fca5a5', fontSize: 13, fontWeight: '700', marginTop: 8, backgroundColor: 'rgba(239,68,68,0.1)', padding: 8, borderRadius: 6, overflow: 'hidden' }
});