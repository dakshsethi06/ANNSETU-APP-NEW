import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import s from '../styles/farmerProfileStyles';

export default function FarmerProfile({ farmerData, totalStockMt, totalBags, pendingRent, activeAlertsCount, hasUnreadNotifications, onNotificationsPress, onUpdateStockPress }) {
  return (
    <View style={s.container}>
      {/* Absolute decorative background circles */}
      <View style={s.circleTopRight} />
      <View style={s.circleBottomRight} />

      {/* Top Header Row */}
      <View style={s.headerRow}>
        <View style={s.profileInfo}>
          <AnnsetuLogo size={38} backgroundColor="rgba(255, 255, 255, 0.15)" iconColor="#FFFFFF" />
          <View style={s.textContainer}>
            <Text style={s.roleLabel}>Farmer / किसान</Text>
            <Text style={s.nameText}>{farmerData.name}</Text>
            <View style={s.locationRow}>
              <Feather name="map-pin" size={11} color="rgba(255, 255, 255, 0.5)" />
              <Text style={s.locationText}>
                {farmerData.village ? `${farmerData.village}, ` : 'Tundla, '}{farmerData.district || 'Firozabad'}, {farmerData.state || 'UP'}
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={s.bellButton} 
          onPress={onNotificationsPress} 
          activeOpacity={0.8}
        >
          <Feather name="bell" size={18} color="#FFFFFF" />
          {hasUnreadNotifications && <View style={s.redDot} />}
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Total Stock</Text>
          <Text style={s.statValue}>{totalStockMt.toFixed(1)} MT</Text>
          <Text style={s.statSub}>{totalBags} bags</Text>
        </View>

        
        <View style={s.statCard}>
          <Text style={s.statLabel}>Pending Rent</Text>
          <Text style={[s.statValue, { color: '#FCA5A5' }]}>
            ₹{pendingRent.toLocaleString('en-IN')}
          </Text>
          <Text style={s.statSub}>{pendingRent > 0 ? 'Overdue' : 'No dues'}</Text>
        </View>
        
        <View style={s.statCard}>
          <Text style={s.statLabel}>Aging Alerts</Text>
          <Text style={[s.statValue, { color: '#FCD34D' }]}>
            {activeAlertsCount}
          </Text>
          <Text style={s.statSub}>{activeAlertsCount > 0 ? 'Action needed' : 'All good'}</Text>
        </View>
      </View>
    </View>
  );
}


