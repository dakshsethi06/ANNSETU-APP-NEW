import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dashboardStyles from './styles/dashboardStyles';
import styles from './styles/farmerDashboardStyles';
import { supabase } from '../../services/supabase';
import FarmerProfile from '../../components/FarmerProfile';

export default function FarmerDashboard({ farmerData, holdingsList, notifications, onBackPress, onNotificationsPress, onActionPress }) {
  const activeAlertsCount = notifications.length;
  const totalStockMt = holdingsList.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0) * 0.1;
  const totalBags = holdingsList.reduce((sum, h) => sum + (h.bags || 0), 0);
  const pendingRent = parseFloat(farmerData.pendingRent || 0);

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={onBackPress}><Feather name="menu" size={20} color="#FFFFFF" /></TouchableOpacity>
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.topBellBtn, { marginRight: 8 }]} onPress={onNotificationsPress} activeOpacity={0.8}>
            <Feather name="bell" size={20} color="#1B4332" />
            {activeAlertsCount > 0 && <View style={styles.topBellDot} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
            <Feather name="log-out" size={18} color="#1B4332" />
          </TouchableOpacity>
        </View>
      </View>

      <FarmerProfile farmerData={farmerData} totalStockMt={totalStockMt} totalBags={totalBags} pendingRent={pendingRent} activeAlertsCount={activeAlertsCount} onNotificationsPress={onNotificationsPress} />

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
          <TouchableOpacity key={action.label + idx} style={dashboardStyles.csGridItem} onPress={() => onActionPress(action.label)} activeOpacity={0.7}>
            <View style={[dashboardStyles.csGridIconContainer, { backgroundColor: action.bg }]}><Text style={{ fontSize: 24 }}>{action.icon}</Text></View>
            <Text style={dashboardStyles.csGridLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
