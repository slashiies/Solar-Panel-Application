import { LinearGradient } from 'expo-linear-gradient';
import { getApps, initializeApp } from 'firebase/app';
import { collection, getFirestore, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

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

export default function TopologyTab() {
  const [currentData, setCurrentData] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'live_telemetry'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentData(snapshot.docs[0].data());
      }
    });
    return () => unsubscribe();
  }, []);

  // Wire into the new AI payload structure
  const analysis = currentData?.analysis || {};
  const mitData = analysis.Active_Mitigation || { apf: "STANDBY", var: "STANDBY", relay: "STANDBY" };
  const actionLogText = analysis.Action_Log || "System nominal. All mitigation units on standby.";
  
  const currentDisturbances = Array.isArray(analysis.Current_Disturbances) ? analysis.Current_Disturbances : [];
  const aiForecast = Array.isArray(analysis.AI_Forecast) ? analysis.AI_Forecast : [];

  const apfActive = mitData.apf === "ACTIVE";
  const reactorActive = mitData.var === "ACTIVE";
  const relayActive = mitData.relay === "TRIPPED";

  const isAlarm = apfActive || reactorActive || relayActive || currentDisturbances.length > 0;
  const logMessages = actionLogText.split(" | ");

  const renderNode = (title: string, isActive: boolean, isFault: boolean, icon: string, statusText: string) => {
    let colors: [string, string] = ['#1e293b', '#0f172a'];
    let borderColor = '#334155';

    if (isFault) {
      colors = ['#450a0a', '#1e293b'];
      borderColor = '#ef4444';
    } else if (isActive) {
      colors = ['#1e3a8a', '#172554'];
      borderColor = '#3b82f6';
    }

    return (
      <LinearGradient colors={colors} style={[styles.nodeCard, { borderColor }]}>
        <Text style={styles.nodeIcon}>{icon}</Text>
        <Text style={styles.nodeTitle}>{title}</Text>
        {isActive && <Text style={styles.activeTag}>{statusText}</Text>}
        {isFault && <Text style={styles.faultTag}>FAULT DETECTED</Text>}
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>GRID TOPOLOGY</Text>
          <Text style={styles.subHeader}>Active Mitigation Map</Text>
        </View>

        <View style={styles.topologyContainer}>
          
          <LinearGradient colors={isAlarm ? ['#7f1d1d', '#450a0a'] : ['#065f46', '#022c22']} style={[styles.mainFeeder, { borderColor: isAlarm ? '#ef4444' : '#10b981' }]}>
            <Text style={styles.feederText}>LVSG MAIN FEEDER (GRID)</Text>
            <Text style={styles.feederSub}>Voltage: {currentData?.telemetry?.rms_voltage?.toFixed(2) || "0.00"}V</Text>
          </LinearGradient>

          <View style={styles.powerLineVertical} />

          <View style={styles.branchContainer}>
            <View style={styles.powerLineHorizontal} />
            <View style={styles.nodesWrapper}>
              
              <View style={styles.nodeColumn}>
                <View style={styles.powerLineDrop} />
                {renderNode("ACTIVE POWER FILTER", apfActive, false, "⚡", "MITIGATION ACTIVE")}
                <View style={styles.powerLineDropShort} />
                <View style={[styles.loadBox, apfActive ? styles.loadFault : {}]}>
                  <Text style={styles.loadText}>ELEVATOR MOTORS</Text>
                </View>
              </View>

              <View style={styles.nodeColumn}>
                <View style={styles.powerLineDrop} />
                {renderNode("VAR COMPENSATOR", reactorActive, false, "🔋", "MITIGATION ACTIVE")}
                <View style={styles.powerLineDropShort} />
                <View style={[styles.loadBox, reactorActive ? styles.loadFault : {}]}>
                  <Text style={styles.loadText}>HVAC / CHILLERS</Text>
                </View>
              </View>

              <View style={styles.nodeColumn}>
                <View style={styles.powerLineDrop} />
                {renderNode("SMART RELAY", false, relayActive, "🔌", "ISOLATED")}
                <View style={styles.powerLineDropShort} />
                <View style={[styles.loadBox, relayActive ? styles.loadFault : {}]}>
                  <Text style={styles.loadText}>WATER PUMPS</Text>
                </View>
              </View>

            </View>
          </View>
        </View>

        <Text style={[styles.cardTitleDark, {marginLeft: 4, marginTop: 32, marginBottom: 12}]}>AI ACTION LOG</Text>
        
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.logCard}>
          {(currentDisturbances.length > 0 || aiForecast.length > 0) && (
            <View style={{marginBottom: 12}}>
              {currentDisturbances.length > 0 && <Text style={styles.logTextAlert}>🔴 LIVE: {currentDisturbances.join(", ")}</Text>}
              {aiForecast.length > 0 && <Text style={styles.logTextPred}>🟣 INCOMING (60s): {aiForecast.join(", ")}</Text>}
              <View style={styles.divider} />
            </View>
          )}

          {logMessages.map((msg: string, idx: number) => (
            <Text key={idx} style={[
              styles.logTextNormal, 
              msg.includes("[Live Incident]") ? {color: '#60a5fa', marginBottom: 4} : {},
              msg.includes("[AI Forecast]") ? {color: '#a855f7', marginBottom: 4} : {}
            ]}>
              {msg.includes("System nominal") ? "✓ " : "➔ "}{msg}
            </Text>
          ))}
        </LinearGradient>

        <View style={{height: 60}} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  header: { marginTop: 60, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: 1 },
  subHeader: { fontSize: 14, color: '#94a3b8', fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  cardTitleDark: { fontSize: 12, color: '#94a3b8', marginBottom: 16, fontWeight: '800', letterSpacing: 2 },
  
  topologyContainer: { alignItems: 'center', marginTop: 10 },
  mainFeeder: { padding: 20, borderRadius: 16, borderWidth: 2, width: '100%', alignItems: 'center', zIndex: 10 },
  feederText: { color: '#f8fafc', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  feederSub: { color: '#cbd5e1', fontSize: 12, marginTop: 4, fontWeight: '700' },
  
  powerLineVertical: { width: 4, height: 30, backgroundColor: '#475569' },
  powerLineHorizontal: { height: 4, width: '80%', backgroundColor: '#475569', position: 'absolute', top: 0 },
  branchContainer: { width: '100%', alignItems: 'center', position: 'relative' },
  nodesWrapper: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 },
  
  nodeColumn: { alignItems: 'center', width: '30%' },
  powerLineDrop: { width: 4, height: 20, backgroundColor: '#475569' },
  powerLineDropShort: { width: 4, height: 15, backgroundColor: '#475569' },
  
  nodeCard: { padding: 12, borderRadius: 12, borderWidth: 2, width: '100%', alignItems: 'center', height: 100, justifyContent: 'center' },
  nodeIcon: { fontSize: 24, marginBottom: 4 },
  nodeTitle: { color: '#f8fafc', fontSize: 9, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  activeTag: { color: '#60a5fa', fontSize: 8, fontWeight: '800', marginTop: 6, textAlign: 'center', backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 4, borderRadius: 4 },
  faultTag: { color: '#ef4444', fontSize: 8, fontWeight: '800', marginTop: 6, textAlign: 'center', backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 4, borderRadius: 4 },
  
  loadBox: { padding: 10, borderRadius: 8, backgroundColor: '#334155', width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#475569' },
  loadFault: { backgroundColor: '#450a0a', borderColor: '#ef4444' },
  loadText: { color: '#cbd5e1', fontSize: 8, fontWeight: '800', textAlign: 'center' },
  
  logCard: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
  logTextNormal: { color: '#10b981', fontSize: 14, fontWeight: '700' },
  logTextAlert: { color: '#ef4444', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  logTextPred: { color: '#a855f7', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
});