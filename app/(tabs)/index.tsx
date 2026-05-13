import { initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const screenWidth = Dimensions.get("window").width;

export default function App() {
  const [history, setHistory] = useState<any[]>([]);
  const [currentData, setCurrentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'live_telemetry'), orderBy('timestamp', 'desc'), limit(15));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Data grabbed from Firebase! Docs found:", snapshot.size);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{marginTop: 10}}>Buffering Time-Series Data...</Text>
      </View>
    );
  }

  const { telemetry, analysis } = currentData;
  const isAlarm = analysis?.['System Status'] === "ALARM" || analysis?.Physical_Alarm;
  const statusColor = isAlarm ? '#ff4444' : '#00C851';

  const voltageData = {
    labels: history.map((_, index) => index.toString()),
    datasets: [
      {
        data: history.map(h => h.telemetry?.rms_voltage || 0),
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 3
      },
      {
        data: history.map(() => 1.10),
        color: () => 'rgba(255, 68, 68, 0.8)',
        withDots: false
      },
      {
        data: history.map(() => 0.90),
        color: () => 'rgba(255, 68, 68, 0.8)',
        withDots: false
      }
    ],
    legend: ["Live Voltage (pu)", "Upper Limit (1.10)", "Lower Limit (0.90)"]
  };

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 3,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Solar Dashboard</Text>
        </View>

        <View style={[styles.card, { borderLeftWidth: 5, borderLeftColor: statusColor }]}>
          <Text style={styles.cardTitle}>AI Engine Status</Text>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {analysis?.['System Status'] || "NORMAL"}
          </Text>
          <Text style={styles.detailText}>
            Forecast Load: <Text style={{fontWeight: 'bold'}}>{analysis?.['Predicted Next Load (kW)']} kW</Text>
          </Text>
          {isAlarm && (
            <Text style={styles.alertText}>⚠️ {analysis?.Disturbances}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Real-Time Voltage Variations</Text>
          <LineChart
            data={voltageData}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withVerticalLines={false}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instantaneous Telemetry</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Frequency</Text>
              <Text style={[styles.value, telemetry?.frequency < 59.7 || telemetry?.frequency > 60.3 ? {color: 'red'} : {}]}>
                {telemetry?.frequency?.toFixed(2)} Hz
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Power Factor</Text>
              <Text style={[styles.value, telemetry?.power_factor < 0.85 ? {color: 'red'} : {}]}>
                {telemetry?.power_factor?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>THD</Text>
              <Text style={styles.value}>{telemetry?.thd_v?.toFixed(2)}%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Unbalance</Text>
              <Text style={[styles.value, telemetry?.voltage_unbalance > 2.5 ? {color: 'red'} : {}]}>
                {telemetry?.voltage_unbalance?.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isAlarm ? '#ff4444' : '#2c3e50' }]} 
          onPress={handleSnooze}
        >
          <Text style={styles.buttonText}>SNOOZE ALARMS (2 MIN)</Text>
        </TouchableOpacity>
        
        <View style={{height: 40}} /> 

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 50, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1e272e' },
  card: { backgroundColor: '#ffffff', padding: 18, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  cardTitle: { fontSize: 14, color: '#808e9b', marginBottom: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusText: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
  detailText: { fontSize: 16, color: '#485460' },
  alertText: { fontSize: 15, color: '#ff4444', marginTop: 12, fontWeight: 'bold', backgroundColor: '#ffeaea', padding: 10, borderRadius: 6, overflow: 'hidden' },
  chart: { marginVertical: 8, borderRadius: 8, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', backgroundColor: '#f8f9fa', padding: 16, borderRadius: 10, marginBottom: 12 },
  label: { fontSize: 12, color: '#808e9b', textTransform: 'uppercase', fontWeight: '600' },
  value: { fontSize: 20, fontWeight: '800', color: '#1e272e', marginTop: 4 },
  button: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});