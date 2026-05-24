import { LinearGradient } from 'expo-linear-gradient';
import { getApps, initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

// Fixes the Hot Reload crash by checking if Firebase is already running
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const screenWidth = Dimensions.get("window").width;

export default function App() {
  const [history, setHistory] = useState<any[]>([]);
  const [currentData, setCurrentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'live_telemetry'), orderBy('timestamp', 'desc'), limit(40));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(doc => doc.data()).reverse();
        setHistory(docs);
        setCurrentData(docs[docs.length - 1]); 
        setLoading(false);
      }
    }, (error) => {
      console.error("🔥 FIREBASE CONNECTION ERROR:", error.message);
    });

    return () => unsubscribe();
  }, []);

  const handleSnooze = async () => {
    try {
      await setDoc(doc(db, 'system_control', 'snooze_state'), { request_snooze: true });
      alert('Snooze command sent to AI Engine! (2 minutes)');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || history.length === 0 || !currentData) {
    return (
      <SafeAreaView style={[styles.center, {backgroundColor: '#0f172a'}]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00f2fe" />
        <Text style={styles.loadingText}>INITIALIZING NEURAL LINK...</Text>
      </SafeAreaView>
    );
  }

  const { telemetry, analysis } = currentData;
  const isAlarm = analysis?.['System Status'] === "ALARM" || analysis?.Physical_Alarm;
  const disturbances = analysis?.Disturbances || "";
  const isWarning = disturbances.includes("Flicker") || 
                    disturbances.includes("Noise") || 
                    disturbances.includes("Harmonics") || 
                    disturbances.includes("Power Factor");

  // --- DYNAMIC GRADIENT ENGINE ---
  // The : [string, string] fixes the TypeScript error you were seeing!
  let statusGradients: [string, string] = ['#00b09b', '#96c93d']; // Vibrant Green (Normal)
  let glowColor = 'rgba(0, 176, 155, 0.5)';
  let uiStatusText = 'SYSTEM OPTIMAL';
  
  if (isAlarm) {
    if (isWarning) {
      statusGradients = ['#f7971e', '#ffd200']; // Solar Orange/Yellow (Warning)
      glowColor = 'rgba(247, 151, 30, 0.5)';
      uiStatusText = 'WARNING DETECTED';
    } else {
      statusGradients = ['#cb2d3e', '#ef473a']; // Deep Crimson (Critical)
      glowColor = 'rgba(203, 45, 62, 0.5)';
      uiStatusText = 'CRITICAL FAULT';
    }
  }

  const voltageData = {
    labels: history.map((_, index) => index.toString()),
    datasets: [
      {
        data: history.map(h => h.telemetry?.rms_voltage || 0),
        color: (opacity = 1) => `rgba(0, 242, 254, ${opacity})`, // Neon Cyan for the live line
        strokeWidth: 3,
        withDots: false
      },
      {
        data: history.map(() => 1.10),
        color: () => 'rgba(239, 71, 58, 0.6)', // Limit lines
        strokeWidth: 1,
        withDots: false
      },
      {
        data: history.map(() => 0.90),
        color: () => 'rgba(239, 71, 58, 0.6)',
        strokeWidth: 1,
        withDots: false
      }
    ]
  };

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "#1e293b",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#0f172a",
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`, // Grid lines
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`, // Axis text
    strokeWidth: 2,
    useShadowColorFromDataset: true,
    decimalPlaces: 2,
    propsForDots: { r: "0" }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>COMMAND CENTER</Text>
          <Text style={styles.subHeader}>Power Quality Diagnostics</Text>
        </View>

        {/* Dynamic Status Card */}
        <LinearGradient 
          colors={statusGradients} 
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}
          style={[styles.statusCard, { shadowColor: glowColor, shadowOpacity: 0.8, shadowRadius: 15 }]}
        >
          <Text style={styles.cardTitleLight}>AI ENGINE STATUS</Text>
          <Text style={styles.statusTextLight}>{uiStatusText}</Text>
          
          <View style={styles.row}>
            <Text style={styles.detailTextLight}>
              Forecast Load: <Text style={{fontWeight: '800'}}>{analysis?.['Predicted Next Load (kW)']} kW</Text>
            </Text>
          </View>

          {isAlarm && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                {isWarning ? '⚡' : '⚠️'} {disturbances}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Chart Card */}
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.glassCard}>
          <Text style={styles.cardTitleDark}>VOLTAGE OSCILLOSCOPE (4Hz)</Text>
          <LineChart
            data={voltageData}
            width={screenWidth - 56} 
            height={220} 
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={true}
            yAxisLabel=""
            yAxisSuffix=""
          />
        </LinearGradient>

        {/* Telemetry Grid */}
        <Text style={[styles.cardTitleDark, {marginLeft: 4, marginBottom: 12}]}>LIVE TELEMETRY</Text>
        <View style={styles.grid}>
          
          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Frequency</Text>
            <Text style={[styles.value, telemetry?.frequency < 59.7 || telemetry?.frequency > 60.3 ? styles.valueError : {}]}>
              {telemetry?.frequency?.toFixed(2)} Hz
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Power Factor</Text>
            <Text style={[styles.value, telemetry?.power_factor < 0.85 ? styles.valueError : {}]}>
              {telemetry?.power_factor?.toFixed(2)}
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>THD</Text>
            <Text style={[styles.value, telemetry?.thd_v > 5.0 ? styles.valueError : {}]}>
              {telemetry?.thd_v?.toFixed(2)}%
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Unbalance</Text>
            <Text style={[styles.value, telemetry?.voltage_unbalance > 2.5 ? styles.valueError : {}]}>
              {telemetry?.voltage_unbalance?.toFixed(2)}%
            </Text>
          </LinearGradient>

        </View>

        <TouchableOpacity onPress={handleSnooze}>
          <LinearGradient colors={['#334155', '#1e293b']} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>SNOOZE SYSTEM ALARMS</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={{height: 60}} /> 

      </ScrollView>
    </SafeAreaView>
  );
}

// Ensure the commas are intact here!
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#00f2fe', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  header: { marginTop: 60, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: 1 },
  subHeader: { fontSize: 14, color: '#94a3b8', fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  
  statusCard: { padding: 24, borderRadius: 24, marginBottom: 24, elevation: 10, shadowOffset: { width: 0, height: 10 } },
  cardTitleLight: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontWeight: '800', letterSpacing: 2 },
  statusTextLight: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 12, letterSpacing: -0.5 },
  detailTextLight: { fontSize: 15, color: '#ffffff', opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center' },
  
  alertBox: { marginTop: 16, backgroundColor: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  alertText: { fontSize: 15, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  
  glassCard: { padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#1e293b' },
  cardTitleDark: { fontSize: 12, color: '#94a3b8', marginBottom: 16, fontWeight: '800', letterSpacing: 2 },
  chart: { marginVertical: 0, borderRadius: 16, alignSelf: 'center', marginLeft: -15 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '47%', padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  label: { fontSize: 11, color: '#94a3b8', letterSpacing: 1.5, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  value: { fontSize: 24, fontWeight: '800', color: '#f8fafc' },
  valueError: { color: '#ef4444', textShadowColor: 'rgba(239, 68, 68, 0.5)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 10 },
  
  actionButton: { padding: 18, borderRadius: 100, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#475569' },
  actionButtonText: { color: '#cbd5e1', fontSize: 13, fontWeight: '800', letterSpacing: 2 }
});