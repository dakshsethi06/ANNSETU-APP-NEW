import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function FarmerProfile({ farmerData, totalStockMt, totalBags, pendingRent, activeAlertsCount, onNotificationsPress, onUpdateStockPress }) {
  return (
    <View style={s.container}>
      {/* Absolute decorative background circles */}
      <View style={s.circleTopRight} />
      <View style={s.circleBottomRight} />

      {/* Top Header Row */}
      <View style={s.headerRow}>
        <View style={s.profileInfo}>
          <Image 
            source={require('../../assets/ann_setu_logo.png')} 
            style={s.logoImage} 
            resizeMode="contain"
          />
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
          {activeAlertsCount > 0 && <View style={s.redDot} />}
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

const s = StyleSheet.create({
  container: {
    backgroundColor: '#1E5C2E', // bg-primary (#1E5C2E)
    paddingHorizontal: 20,     // px-5
    paddingTop: 20,            // pt-5
    paddingBottom: 28,         // pb-7
    marginHorizontal: -20,     // To offset the parent scrollview horizontal padding
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
  },
  // Background circle overlays matching tailwind translate classes
  circleTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circleBottomRight: {
    position: 'absolute',
    bottom: -32,
    right: 48,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    zIndex: 10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  roleLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  nameText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginLeft: 4,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F87171', // bg-red-400
    borderWidth: 1.5,
    borderColor: '#1E5C2E',
  },
  // Stats row grid layout
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // bg-white/10
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  statSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
});
