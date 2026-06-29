import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import dashboardStyles from '../screens/home/styles/dashboardStyles';
import styles from '../screens/home/styles/farmerDashboardStyles';

export default function FarmerProfile({ farmerData, totalStockMt, totalBags, pendingRent, activeAlertsCount, onNotificationsPress }) {
  return (
    <View style={dashboardStyles.csDashboardHeader}>
      <LinearGradient colors={['#1B4332', '#2D6A4F']} style={dashboardStyles.csHeaderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.profileHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.farmerLabel}>Farmer / किसान</Text>
            <Text style={styles.farmerName}>{farmerData.name}</Text>
            <Text style={styles.farmerLocation}>
              <Feather name="map-pin" size={12} color="#A8D5BA" /> {farmerData.village ? `${farmerData.village}, ` : ''}{farmerData.district || 'Firozabad'}, {farmerData.state || 'UP'}
            </Text>
          </View>
          <TouchableOpacity style={styles.greenBellBtn} onPress={onNotificationsPress} activeOpacity={0.8}>
            <Feather name="bell" size={22} color="#FFFFFF" />
            {activeAlertsCount > 0 && <View style={styles.greenBellDot} />}
          </TouchableOpacity>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Total Stock</Text>
            <Text style={styles.summaryCardValue}>{totalStockMt.toFixed(1)} MT</Text>
            <Text style={styles.summaryCardSub}>{totalBags} bags</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Pending Rent</Text>
            <Text style={[styles.summaryCardValue, { color: '#E53E3E' }]}>₹{pendingRent.toLocaleString('en-IN')}</Text>
            <Text style={styles.summaryCardSub}>{pendingRent > 0 ? 'Overdue' : 'No dues'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Aging Alerts</Text>
            <Text style={[styles.summaryCardValue, { color: activeAlertsCount > 0 ? '#DD6B20' : COLORS.greenDeep }]}>{activeAlertsCount}</Text>
            <Text style={styles.summaryCardSub}>{activeAlertsCount > 0 ? 'Action needed' : 'All good'}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
