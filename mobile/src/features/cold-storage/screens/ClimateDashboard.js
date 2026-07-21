import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../../core/network/config';

export default function ClimateDashboard({ coldStorageId, onBack }) {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);

  // Poll telemetry every 5 seconds
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTelemetry = async () => {
    try {
      let token = '';
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        token = await AsyncStorage.getItem('userToken');
      } catch (e) {
        // Fallback for demo
      }
      const response = await fetch(`${BACKEND_URL}/api/telemetry/live`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (!result.success) {
        console.error('Error fetching telemetry:', result.error);
        return;
      }

      // Group by device_id to get latest reading per chamber
      const latestPerDevice = {};
      result.data.forEach(row => {
        if (!latestPerDevice[row.device_id]) {
          latestPerDevice[row.device_id] = row;
        }
      });

      setTelemetry(Object.values(latestPerDevice));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (temp, humidity, isOffline) => {
    if (isOffline) {
      return { label: 'Needs Maintenance (Offline)', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' };
    }
    // Simple logic for Safe/Danger zones
    if (temp > 10.0 || temp < 0.0) {
      return { label: 'Danger (High Temp)', color: '#DC2626', bg: '#FEE2E2', icon: 'thermometer-alert' };
    }
    if (humidity > 95 || humidity < 60) {
      return { label: 'Danger (Humidity)', color: '#D97706', bg: '#FEF3C7', icon: 'water-alert' };
    }
    return { label: 'Safe Zone (Good)', color: '#16A34A', bg: '#DCFCE7', icon: 'check-circle' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E5C2E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1E5C2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Climate Status</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Live Chamber Monitoring</Text>
        
        {telemetry.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No active chambers reporting data.</Text>
          </View>
        ) : (
          telemetry.map(device => {
            const temp = parseFloat(device.temperature);
            const hum = parseFloat(device.humidity);
            const isOffline = Date.now() - new Date(device.timestamp).getTime() > 15 * 60 * 1000;
            const status = getStatusInfo(temp, hum, isOffline);

            // Translate technical battery voltage to percentage (approx: 4.2V = 100%, 3.3V = 0%)
            const batV = parseFloat(device.battery_voltage) || 4.2;
            let batPercent = Math.round(((batV - 3.3) / (4.2 - 3.3)) * 100);
            if (batPercent > 100) batPercent = 100;
            if (batPercent < 0) batPercent = 0;

            return (
              <View key={device.device_id} style={[styles.card, { borderColor: status.color }]}>
                {/* Header Status Row */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.deviceName}>Chamber: {device.device_id}</Text>
                    <Text style={styles.timestamp}>Last updated: {new Date(device.timestamp).toLocaleTimeString()}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Feather name={status.icon.includes('thermometer') ? 'thermometer' : status.icon.includes('water') ? 'droplet' : 'check-circle'} size={14} color={status.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                {/* Readings Row */}
                <View style={styles.readingsGrid}>
                  <View style={styles.readingBox}>
                    <Text style={styles.readingLabel}>Temperature</Text>
                    <Text style={[styles.readingValue, { color: temp > 10 ? '#DC2626' : '#16A34A' }]}>{temp}°C</Text>
                  </View>
                  <View style={styles.readingBox}>
                    <Text style={styles.readingLabel}>Humidity</Text>
                    <Text style={[styles.readingValue, { color: hum > 95 || hum < 60 ? '#D97706' : '#16A34A' }]}>{hum}%</Text>
                  </View>
                </View>

                {/* Battery Status */}
                <View style={styles.batteryContainer}>
                  <Feather name="battery" size={16} color="#71717A" style={{ marginRight: 6 }} />
                  <Text style={styles.batteryLabel}>Battery Health: </Text>
                  <View style={styles.batteryBarBg}>
                    <View style={[styles.batteryBarFill, { width: `${batPercent}%`, backgroundColor: batPercent > 20 ? '#16A34A' : '#DC2626' }]} />
                  </View>
                  <Text style={styles.batteryText}>{batPercent}%</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF7F0',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  backBtn: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E5C2E',
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3F3F46',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#18181B',
  },
  timestamp: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  readingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F4F4F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  readingBox: {
    alignItems: 'center',
    flex: 1,
  },
  readingLabel: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
    marginBottom: 4,
  },
  readingValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryLabel: {
    fontSize: 13,
    color: '#3F3F46',
  },
  batteryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E4E4E7',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  batteryText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3F3F46',
  },
  emptyBox: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#A1A1AA',
    alignItems: 'center',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
  }
});
