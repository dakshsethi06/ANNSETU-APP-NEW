import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import dashboardStyles from './styles/dashboardStyles';
import styles from './styles/farmerDashboardStyles';


export default function FarmerDashboard({
  farmerData,
  holdingsList,
  notifications,
  onBackPress,
  onNotificationsPress,
  onActionPress,
}) {
  const activeAlertsCount = notifications.length;

  const totalStockMt = holdingsList.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0) * 0.1;
  const totalBags = holdingsList.reduce((sum, h) => sum + (h.bags || 0), 0);

  const pendingRent = parseFloat(farmerData.pendingRent || 0);

  return (
    <View style={{ width: '100%' }}>
      {/* 1. Top White Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={onBackPress}>
            <Feather name="menu" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
        <TouchableOpacity style={styles.topBellBtn} onPress={onNotificationsPress} activeOpacity={0.8}>
          <Feather name="bell" size={20} color="#1B4332" />
          {activeAlertsCount > 0 && <View style={styles.topBellDot} />}
        </TouchableOpacity>
      </View>

      {/* 2. Green Dashboard Profile Header */}
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

          {/* 3. Summary Cards Row (Total Stock, Pending Rent, Aging Alerts) */}
          <View style={styles.summaryRow}>
            {/* Total Stock */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardLabel}>Total Stock</Text>
              <Text style={styles.summaryCardValue}>{totalStockMt.toFixed(1)} MT</Text>
              <Text style={styles.summaryCardSub}>{totalBags} bags</Text>
            </View>

            {/* Pending Rent */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardLabel}>Pending Rent</Text>
              <Text style={[styles.summaryCardValue, { color: '#E53E3E' }]}>
                ₹{pendingRent.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.summaryCardSub}>{pendingRent > 0 ? 'Overdue' : 'No dues'}</Text>
            </View>

            {/* Aging Alerts */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardLabel}>Aging Alerts</Text>
              <Text style={[styles.summaryCardValue, { color: activeAlertsCount > 0 ? '#DD6B20' : COLORS.greenDeep }]}>
                {activeAlertsCount}
              </Text>
              <Text style={styles.summaryCardSub}>{activeAlertsCount > 0 ? 'Action needed' : 'All good'}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* 4. Quick Actions */}
      <Text style={dashboardStyles.csSectionTitle}>Quick Actions</Text>
      <View style={dashboardStyles.csGridContainer}>
        {[
          { label: 'My Stock', icon: '📦', bg: '#E8F5E9', color: '#2E7D32' },
          { label: 'Mandi Rates', icon: '📈', bg: '#E3F2FD', color: '#1565C0' },
          { label: 'My Khata', icon: '📒', bg: '#FFF3E0', color: '#E65100' },
          { label: 'Dispatch', icon: '🚚', bg: '#F3E5F5', color: '#4A148C' },
          { label: 'Weather', icon: '☁️', bg: '#E0F7FA', color: '#006064' },
          { label: 'Book Space', icon: '➕', bg: '#FCE4EC', color: '#C62828' }
        ].map((action, idx) => (
          <TouchableOpacity
            key={action.label + idx}
            style={dashboardStyles.csGridItem}
            onPress={() => onActionPress(action.label)}
            activeOpacity={0.7}
          >
            <View style={[dashboardStyles.csGridIconContainer, { backgroundColor: action.bg }]}>
              <Text style={{ fontSize: 24 }}>{action.icon}</Text>
            </View>
            <Text style={dashboardStyles.csGridLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

