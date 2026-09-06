import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const screenWidth = Dimensions.get("window").width;

export default function App() {
  const [history, setHistory] = useState<any[]>([]);
  const [currentData, setCurrentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [engineActive, setEngineActive] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, 'live_telemetry'), orderBy('timestamp', 'desc'), limit(40));
    
    const unsubscribeTelemetry = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(doc => doc.data()).reverse();
        setHistory(docs);
        setCurrentData(docs[docs.length - 1]); 
        setLoading(false);
      }
    });

    const engineRef = doc(db, 'system_control', 'engine_state');
    const unsubscribeEngine = onSnapshot(engineRef, (docSnap) => {
        if (docSnap.exists()) {
            setEngineActive(docSnap.data().engine_active);
        }
    });

    return () => {
        unsubscribeTelemetry();
        unsubscribeEngine();
    };
  }, []);

  const handleSnooze = async () => {
    try {
      await setDoc(doc(db, 'system_control', 'snooze_state'), { request_snooze: true });
    } catch (error) {}
  };

  const handleEngineToggle = async () => {
    try {
        await setDoc(doc(db, 'system_control', 'engine_state'), { engine_active: !engineActive }, { merge: true });
    } catch (error) {}
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
  
  const currentDisturbancesArray = Array.isArray(analysis?.Current_Disturbances) ? analysis.Current_Disturbances : [];
  const aiForecastArray = Array.isArray(analysis?.AI_Forecast) ? analysis.AI_Forecast : [];
  
  const isCriticalCurrent = currentDisturbancesArray.some((d: string) => 
    ["Voltage Sag", "Voltage Swell", "Spike / Surge", "Interruption", "Overvoltage", "Undervoltage / Brownout"].includes(d)
  );

  let statusGradients: [string, string] = ['#00b09b', '#96c93d'];
  let glowColor = 'rgba(0, 176, 155, 0.5)';
  let uiStatusText = 'SYSTEM OPTIMAL';
  let currentActiveVariation = 'Current State: Nominal Power Flow';
  
  if (currentDisturbancesArray.length > 0) {
    uiStatusText = currentDisturbancesArray[0].toUpperCase();
    currentActiveVariation = `Current State: ${currentDisturbancesArray.join(", ")}`;

    if (isCriticalCurrent) {
      statusGradients = ['#cb2d3e', '#ef473a'];
      glowColor = 'rgba(203, 45, 62, 0.5)';
    } else {
      statusGradients = ['#f7971e', '#ffd200'];
      glowColor = 'rgba(247, 151, 30, 0.5)';
    }
  }

  if (!engineActive) {
      statusGradients = ['#1e293b', '#0f172a'];
      glowColor = 'transparent';
      uiStatusText = 'SYSTEM OFFLINE';
      currentActiveVariation = 'Engine Halted';
  }

  const nextV = analysis?.['Predicted Next Voltage'];
  const predictedVarStr = analysis?.['Predicted Variation'] || "±0.00V";
  
  let incomingThreat = "CALCULATING...";
  let threatColor = "#94a3b8"; 

  if (nextV !== undefined) {
    if (nextV < 200.0) { 
        incomingThreat = "CRITICAL: BROWNOUT"; 
        threatColor = "#ef4444"; 
    }
    else if (nextV < 207.0) { 
        incomingThreat = "WARNING: SAG"; 
        threatColor = "#f59e0b"; 
    }
    else if (nextV > 260.0) { 
        incomingThreat = "CRITICAL: OVERVOLTAGE"; 
        threatColor = "#ef4444"; 
    }
    else if (nextV > 253.0) { 
        incomingThreat = "WARNING: SWELL"; 
        threatColor = "#f59e0b"; 
    }
    else if (aiForecastArray.length > 0) { 
        incomingThreat = `IMPEDING: ${aiForecastArray[0].toUpperCase()}`; 
        threatColor = "#8b5cf6"; 
    }
    else {
        incomingThreat = "STABLE TRAJECTORY"; 
        threatColor = "#10b981"; 
    }
  }

  const varNumber = parseFloat(predictedVarStr.replace(/[^0-9.]/g, '')) || 0; 
  const confidenceScore = Math.max(0, Math.min(99.9, 100 - (varNumber * 2.5))).toFixed(1);

  const chartHistory = history.length === 1 ? [history[0], history[0]] : history;
  
  const voltageData = {
    labels: chartHistory.map((_, index) => index.toString()),
    datasets: [
      {
        data: chartHistory.map(h => (h?.telemetry?.rms_voltage || 0) / 230),
        color: (opacity = 1) => `rgba(0, 242, 254, ${opacity})`,
        strokeWidth: 3,
        withDots: false
      },
      { data: chartHistory.map(() => 1.10), color: () => 'rgba(239, 71, 58, 0.6)', strokeWidth: 1, withDots: false },
      { data: chartHistory.map(() => 0.90), color: () => 'rgba(239, 71, 58, 0.6)', strokeWidth: 1, withDots: false }
    ]
  };

  const trendData = {
    labels: chartHistory.map((_, index) => index.toString()),
    datasets: [
      {
        data: chartHistory.map(h => h?.telemetry?.rms_voltage || 0),
        color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
        strokeWidth: 3,
        withDots: false
      }
    ]
  };

  const trackerLabels = [...chartHistory.map((_, index) => index.toString()), chartHistory.length.toString()];
  
  const rawLiveData = chartHistory.map(h => h?.telemetry?.rms_voltage || 0);
  const delayedLiveData = rawLiveData.length > 1 ? rawLiveData.slice(0, -1) : rawLiveData;

  const shiftedPrediction = [];
  
  for (let i = 0; i < chartHistory.length; i++) {
      if (i === 0) {
          shiftedPrediction.push(rawLiveData[0]);
      } else {
          const pastV = chartHistory[i-1]?.telemetry?.rms_voltage || 0;
          const pastPred = chartHistory[i-1]?.analysis?.['Predicted Next Voltage'] || pastV;
          
          const pastVisualPred = pastV + ((pastPred - pastV) / 4); 
          shiftedPrediction.push(pastVisualPred);
      }
  }

  if (chartHistory.length > 0) {
      const currentV = chartHistory[chartHistory.length - 1]?.telemetry?.rms_voltage || 0;
      const currentPred = chartHistory[chartHistory.length - 1]?.analysis?.['Predicted Next Voltage'] || currentV;
      const futureVisualPred = currentV + ((currentPred - currentV) / 4);
      shiftedPrediction.push(futureVisualPred);
  } else {
      shiftedPrediction.push(0);
  }

  const predictionData = {
    labels: trackerLabels,
    datasets: [
      {
        data: delayedLiveData,
        color: (opacity = 1) => `rgba(167, 139, 250, 0.3)`,
        strokeWidth: 2,
        withDots: false
      },
      {
        data: shiftedPrediction,
        color: (opacity = 1) => `rgba(245, 158, 11, 1)`,
        strokeWidth: 3,
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
    color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: true,
    decimalPlaces: 2,
    propsForDots: { r: "0" }
  };

  const getIconForAnomaly = (type: string) => {
    if (type.includes("Sag") || type.includes("Interruption") || type.includes("Brownout")) return "⬇️";
    if (type.includes("Swell") || type.includes("Spike") || type.includes("Overvoltage") || type.includes("Rise")) return "⬆️";
    if (type.includes("Noise") || type.includes("Flicker") || type.includes("Harmonic") || type.includes("Drift") || type.includes("Imbalance")) return "⚡";
    return "⚠️";
  };

  // Live Electrical Calculations
  const liveVoltage = telemetry?.rms_voltage || 0;
  const liveCurrent = telemetry?.rms_current || 0;
  const livePf = telemetry?.power_factor || 0;
  const liveKw = (liveVoltage * liveCurrent * livePf) / 1000;
  const liveKva = (liveVoltage * liveCurrent) / 1000;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>COMMAND CENTER</Text>
          <Text style={styles.subHeader}>Power Quality Diagnostics</Text>
        </View>

        <LinearGradient 
          colors={statusGradients} 
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}
          style={[styles.statusCard, { shadowColor: glowColor, shadowOpacity: 0.8, shadowRadius: 15 }]}
        >
          <Text style={styles.cardTitleLight}>AI ENGINE STATUS</Text>
          <Text style={styles.statusTextLight}>{uiStatusText}</Text>
          {engineActive && <Text style={styles.currentVariationText}>{currentActiveVariation}</Text>}
          
          <View style={styles.row}>
            <Text style={styles.detailTextLight}>
              Forecast Load: <Text style={{fontWeight: '800'}}>{analysis?.['Predicted Next Load (kW)'] || "0.00"} kW</Text>
            </Text>
          </View>

          {currentDisturbancesArray.length > 0 && engineActive && (
            <View style={styles.threatContainer}>
              <Text style={styles.threatHeader}>ACTIVE LIVE DISTURBANCES</Text>
              <View style={styles.pillRow}>
                {currentDisturbancesArray.map((disturbance: string, index: number) => (
                  <View key={index} style={styles.threatPill}>
                    <Text style={styles.threatPillText}>
                      {getIconForAnomaly(disturbance)} {disturbance}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </LinearGradient>

        <Text style={[styles.cardTitleDark, {marginLeft: 4, marginBottom: 12}]}>LIVE TELEMETRY</Text>
        <View style={styles.grid}>
          
          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Voltage</Text>
            <Text style={[styles.value, liveVoltage < 207 || liveVoltage > 253 ? styles.valueError : {}]}>
              {liveVoltage.toFixed(2)} V
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Current</Text>
            <Text style={styles.value}>
              {liveCurrent.toFixed(2)} A
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Active Power</Text>
            <Text style={styles.value}>
              {liveKw.toFixed(2)} kW
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Apparent Power</Text>
            <Text style={styles.value}>
              {liveKva.toFixed(2)} kVA
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Frequency</Text>
            <Text style={[styles.value, telemetry?.frequency < 59.7 || telemetry?.frequency > 60.3 ? styles.valueError : {}]}>
              {telemetry?.frequency?.toFixed(2) || "0.00"} Hz
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Power Factor</Text>
            <Text style={[styles.value, telemetry?.power_factor < 0.85 ? styles.valueError : {}]}>
              {telemetry?.power_factor?.toFixed(2) || "0.00"}
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>THD</Text>
            <Text style={[styles.value, telemetry?.thd_v > 5.0 ? styles.valueError : {}]}>
              {telemetry?.thd_v?.toFixed(2) || "0.00"}%
            </Text>
          </LinearGradient>

          <LinearGradient colors={['#1e293b', '#1e293b']} style={styles.gridItem}>
            <Text style={styles.label}>Unbalance</Text>
            <Text style={[styles.value, telemetry?.voltage_unbalance > 2.5 ? styles.valueError : {}]}>
              {telemetry?.voltage_unbalance?.toFixed(2) || "0.00"}%
            </Text>
          </LinearGradient>
        </View>

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.predictionCard}>
          <Text style={styles.cardTitleDark}>AI VOLTAGE FORECAST (t+60s)</Text>
          
          <View style={styles.predictionRow}>
            <View style={styles.predictionBox}>
              <Text style={styles.predictionLabel}>NEXT VOLTAGE EST.</Text>
              <Text style={styles.predictionValuePrimary}>
                {nextV ? `${nextV.toFixed(1)}V` : "---"}
              </Text>
            </View>
            <View style={styles.predictionBox}>
              <Text style={styles.predictionLabel}>EXPECTED VARIATION</Text>
              <Text style={styles.predictionValueSecondary}>
                {predictedVarStr}
              </Text>
            </View>
          </View>

          <View style={styles.forecastMetricsRow}>
            <View style={styles.predictionBox}>
              <Text style={styles.predictionLabel}>INCOMING TRAJECTORY</Text>
              <Text style={[styles.predictionValuePrimary, { color: threatColor, fontSize: 18 }]}>
                {incomingThreat}
              </Text>
            </View>
            <View style={styles.predictionBox}>
              <Text style={styles.predictionLabel}>FORECAST CONFIDENCE</Text>
              <Text style={[styles.predictionValueSecondary, { color: '#8b5cf6', fontSize: 18 }]}>
                {confidenceScore}%
              </Text>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.glassCard}>
          <Text style={styles.cardTitleDark}>VOLTAGE OSCILLOSCOPE (1Hz)</Text>
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

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.glassCard}>
          <Text style={styles.cardTitleDark}>RECENT VOLTAGE TREND (V)</Text>
          <LineChart
            data={trendData}
            width={screenWidth - 56} 
            height={220} 
            chartConfig={{
              ...chartConfig,
              decimalPlaces: 1,
            }}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={true}
            yAxisLabel=""
            yAxisSuffix="V"
          />
        </LinearGradient>

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.glassCard}>
          <Text style={styles.cardTitleDark}>AI PREDICTION DELTA TRACKER</Text>
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(167, 139, 250, 1)' }]} />
              <Text style={styles.legendText}>Live Voltage</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(245, 158, 11, 1)' }]} />
              <Text style={styles.legendText}>Forecast Trajectory</Text>
            </View>
          </View>

          <LineChart
            data={predictionData}
            width={screenWidth - 56} 
            height={220} 
            chartConfig={{
              ...chartConfig,
              decimalPlaces: 1,
            }}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={true}
            yAxisLabel=""
            yAxisSuffix="V"
          />
        </LinearGradient>

        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.historySectionCard}>
          <Text style={styles.cardTitleDark}>RECENT REAL-TIME TELEMETRY LOGS</Text>
          <View style={styles.logHeaderRow}>
            <Text style={[styles.logHeaderCell, { flex: 1.2 }]}>TIME</Text>
            <Text style={[styles.logHeaderCell, { flex: 1 }]}>VOLTAGE</Text>
            <Text style={[styles.logHeaderCell, { flex: 1.2 }]}>STATUS</Text>
            <Text style={[styles.logHeaderCell, { flex: 1.8 }]}>DISTURBANCE</Text>
          </View>
          {[...history].reverse().slice(0, 5).map((item, idx) => {
            const timeStr = item?.timestamp?.seconds 
              ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) 
              : 'LIVE';
            const vVal = item?.telemetry?.rms_voltage ? `${item.telemetry.rms_voltage.toFixed(1)}V` : '---';
            const statusVal = item?.analysis?.['System Status'] || 'OPTIMAL';
            
            const currArr = Array.isArray(item?.analysis?.Current_Disturbances) ? item.analysis.Current_Disturbances : [];
            const aiArr = Array.isArray(item?.analysis?.AI_Forecast) ? item.analysis.AI_Forecast : [];
            const logCombinedArr = [...currArr, ...aiArr];
            const distStr = logCombinedArr.length > 0 ? logCombinedArr.join(', ') : 'None';
            
            let statusColor = '#10b981';
            if (statusVal === 'ALARM') statusColor = '#ef4444';
            if (statusVal === 'SNOOZED') statusColor = '#f59e0b';

            return (
              <View key={idx} style={styles.logDataRow}>
                <Text style={[styles.logDataCell, { flex: 1.2, color: '#94a3b8' }]}>{timeStr}</Text>
                <Text style={[styles.logDataCell, { flex: 1, color: '#f8fafc', fontWeight: '700' }]}>{vVal}</Text>
                <Text style={[styles.logDataCell, { flex: 1.2, color: statusColor, fontWeight: '800' }]}>{statusVal}</Text>
                <Text style={[styles.logDataCell, { flex: 1.8, color: distStr !== 'None' ? '#f59e0b' : '#64748b', fontSize: 11 }]} numberOfLines={1}>{distStr}</Text>
              </View>
            );
          })}
        </LinearGradient>

        <TouchableOpacity onPress={handleEngineToggle}>
          <LinearGradient colors={engineActive ? ['#7f1d1d', '#450a0a'] : ['#065f46', '#022c22']} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{engineActive ? "HALT AI ENGINE" : "START AI ENGINE"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSnooze}>
          <LinearGradient colors={['#334155', '#1e293b']} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>SNOOZE SYSTEM ALARMS</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/history')}>
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.historyButton}>
            <Text style={styles.historyButtonText}>VIEW HISTORICAL LOGS ➔</Text>
          </LinearGradient>
        </TouchableOpacity>
        
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
  
  statusCard: { padding: 24, borderRadius: 24, marginBottom: 24, elevation: 10, shadowOffset: { width: 0, height: 10 } },
  cardTitleLight: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontWeight: '800', letterSpacing: 2 },
  statusTextLight: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 2, letterSpacing: -0.5 },
  currentVariationText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginBottom: 12, fontStyle: 'italic' },
  detailTextLight: { fontSize: 15, color: '#ffffff', opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center' },
  
  threatContainer: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  threatHeader: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  threatPill: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  threatPillText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  
  predictionCard: { padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#3b82f6', backgroundColor: 'rgba(30, 58, 138, 0.1)' },
  predictionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  forecastMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(59, 130, 246, 0.3)' },
  predictionBox: { flex: 1 },
  predictionLabel: { fontSize: 10, color: '#94a3b8', letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 },
  predictionValuePrimary: { fontSize: 26, fontWeight: '900', color: '#60a5fa' },
  predictionValueSecondary: { fontSize: 26, fontWeight: '900', color: '#10b981' },
  
  glassCard: { padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#1e293b' },
  cardTitleDark: { fontSize: 12, color: '#94a3b8', marginBottom: 16, fontWeight: '800', letterSpacing: 2 },
  chart: { marginVertical: 0, borderRadius: 16, alignSelf: 'center', marginLeft: -15 },
  
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5 },
  
  historySectionCard: { padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#1e293b' },
  logHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8, marginBottom: 8 },
  logHeaderCell: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  logDataRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(51, 65, 85, 0.2)', alignItems: 'center' },
  logDataCell: { fontSize: 12, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '47%', padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  label: { fontSize: 11, color: '#94a3b8', letterSpacing: 1.5, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  value: { fontSize: 24, fontWeight: '800', color: '#f8fafc' },
  valueError: { color: '#ef4444', textShadowColor: 'rgba(239, 68, 68, 0.5)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 10 },
  
  actionButton: { padding: 18, borderRadius: 100, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#475569' },
  actionButtonText: { color: '#cbd5e1', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  
  historyButton: { padding: 18, borderRadius: 100, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#334155' },
  historyButtonText: { color: '#94a3b8', fontSize: 13, fontWeight: '800', letterSpacing: 2 }
});