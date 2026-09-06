import { LinearGradient } from 'expo-linear-gradient';
import { getApps, initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

export default function SettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [engineActive, setEngineActive] = useState(true);
  
  const [freqMin, setFreqMin] = useState(59.7);
  const [freqMax, setFreqMax] = useState(60.3);
  const [thdLimit, setThdLimit] = useState(5.0);
  const [pfLimit, setPfLimit] = useState(0.85);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const paramDoc = await getDoc(doc(db, 'system_control', 'ai_parameters'));
        if (paramDoc.exists()) {
          const data = paramDoc.data();
          setFreqMin(data.freq_min || 59.7);
          setFreqMax(data.freq_max || 60.3);
          setThdLimit(data.thd_limit || 5.0);
          setPfLimit(data.pf_limit || 0.85);
        }
      } catch (error) {}
      setLoading(false);
    };

    const unsubEngine = onSnapshot(doc(db, 'system_control', 'engine_state'), (docSnap) => {
        if (docSnap.exists()) setEngineActive(docSnap.data().engine_active);
    });

    fetchData();
    return () => unsubEngine();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system_control', 'ai_parameters'), {
        freq_min: parseFloat(freqMin.toFixed(2)),
        freq_max: parseFloat(freqMax.toFixed(2)),
        thd_limit: parseFloat(thdLimit.toFixed(2)),
        pf_limit: parseFloat(pfLimit.toFixed(2)),
        updated_at: new Date()
      });
      Alert.alert("Success", "AI Engine parameters synchronized.");
    } catch (error) {
      Alert.alert("Error", "Failed to update AI parameters.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEngine = async () => {
    try {
        await setDoc(doc(db, 'system_control', 'engine_state'), { engine_active: !engineActive }, { merge: true });
    } catch (error) {}
  };

  const adjustValue = (setter: any, current: number, step: number, min: number, max: number) => {
    setter((prev: number) => {
      const newValue = prev + step;
      if (newValue >= min && newValue <= max) return newValue;
      return prev;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, {backgroundColor: '#0f172a'}]}>
        <ActivityIndicator size="large" color="#00f2fe" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI PARAMETERS</Text>
          <Text style={styles.subHeader}>Regulatory Compliance Engine</Text>
        </View>

        <TouchableOpacity onPress={toggleEngine} style={{marginBottom: 24}}>
          <LinearGradient colors={engineActive ? ['#7f1d1d', '#450a0a'] : ['#065f46', '#022c22']} style={styles.engineButton}>
            <Text style={styles.engineButtonText}>{engineActive ? "HALT AI ENGINE" : "START AI ENGINE"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.cardTitleDark, {marginLeft: 4, marginBottom: 12}]}>PHILIPPINE DISTRIBUTION CODE</Text>
        
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.controlCard}>
          <View style={styles.controlRow}>
            <View>
              <Text style={styles.controlLabel}>MINIMUM FREQUENCY</Text>
              <Text style={styles.controlDesc}>Grid lower bound (Hz)</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setFreqMin, freqMin, -0.1, 58.0, 60.0)}><Text style={styles.stepText}>-</Text></TouchableOpacity>
              <Text style={styles.valueText}>{freqMin.toFixed(2)}</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setFreqMin, freqMin, 0.1, 58.0, 60.0)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.controlRow}>
            <View>
              <Text style={styles.controlLabel}>MAXIMUM FREQUENCY</Text>
              <Text style={styles.controlDesc}>Grid upper bound (Hz)</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setFreqMax, freqMax, -0.1, 60.0, 62.0)}><Text style={styles.stepText}>-</Text></TouchableOpacity>
              <Text style={styles.valueText}>{freqMax.toFixed(2)}</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setFreqMax, freqMax, 0.1, 60.0, 62.0)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <Text style={[styles.cardTitleDark, {marginLeft: 4, marginTop: 12, marginBottom: 12}]}>IEEE 519-2014 STANDARDS</Text>
        
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.controlCard}>
          <View style={styles.controlRow}>
            <View>
              <Text style={styles.controlLabel}>THD TOLERANCE LIMIT</Text>
              <Text style={styles.controlDesc}>Max harmonic distortion (%)</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setThdLimit, thdLimit, -0.5, 1.0, 15.0)}><Text style={styles.stepText}>-</Text></TouchableOpacity>
              <Text style={styles.valueText}>{thdLimit.toFixed(1)}</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setThdLimit, thdLimit, 0.5, 1.0, 15.0)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.controlRow}>
            <View>
              <Text style={styles.controlLabel}>POWER FACTOR FLOOR</Text>
              <Text style={styles.controlDesc}>Minimum allowable PF</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setPfLimit, pfLimit, -0.01, 0.50, 0.99)}><Text style={styles.stepText}>-</Text></TouchableOpacity>
              <Text style={styles.valueText}>{pfLimit.toFixed(2)}</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustValue(setPfLimit, pfLimit, 0.01, 0.50, 0.99)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity onPress={saveSettings} disabled={saving}>
          <LinearGradient colors={['#059669', '#047857']} style={styles.saveButton}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveButtonText}>SYNC WITH AI ENGINE</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{height: 60}} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 60, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: 1 },
  subHeader: { fontSize: 14, color: '#94a3b8', fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  cardTitleDark: { fontSize: 12, color: '#94a3b8', marginBottom: 16, fontWeight: '800', letterSpacing: 2 },
  controlCard: { padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#1e293b' },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  controlLabel: { fontSize: 13, fontWeight: '800', color: '#e2e8f0', letterSpacing: 1, marginBottom: 4 },
  controlDesc: { fontSize: 11, color: '#64748b' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  stepButton: { paddingHorizontal: 16, paddingVertical: 10 },
  stepText: { color: '#38bdf8', fontSize: 20, fontWeight: '900' },
  valueText: { color: '#f8fafc', fontSize: 16, fontWeight: '800', width: 45, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  engineButton: { padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#7f1d1d' },
  engineButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  saveButton: { padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#10b981' },
  saveButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 2 }
});