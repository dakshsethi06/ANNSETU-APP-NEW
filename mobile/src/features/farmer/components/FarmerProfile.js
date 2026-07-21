import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import s from '../styles/farmerProfileStyles';
import { useTranslation } from 'react-i18next';
import TranslatedText from '../../../core/components/TranslatedText';

export default function FarmerProfile({ 
  farmerData, 
  totalStockMt, 
  totalBags, 
  pendingRent, 
  activeAlertsCount, 
  hasUnreadNotifications, 
  onNotificationsPress, 
  onUpdateStockPress,
  onKhataPress,
  onStockPress
}) {
  const { t } = useTranslation();
  const addressText = `${farmerData.village ? `${farmerData.village}, ` : 'Tundla, '}${farmerData.district || 'Firozabad'}, ${farmerData.state || 'UP'}`;

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
            <Text style={s.roleLabel}>{t('dashboard.farmer_title')}</Text>
            <TranslatedText style={s.nameText}>{farmerData.name}</TranslatedText>
            <View style={s.locationRow}>
              <Feather name="map-pin" size={11} color="rgba(255, 255, 255, 0.5)" />
              <TranslatedText style={s.locationText}>
                {addressText}
              </TranslatedText>
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
        <TouchableOpacity 
          style={s.statCard} 
          activeOpacity={0.8}
          onPress={onStockPress}
        >
          <Text style={s.statLabel}>{t('dashboard.total_stock')}</Text>
          <Text style={s.statValue}>{totalStockMt.toFixed(1)} MT</Text>
          <Text style={s.statSub}>{totalBags} {t('dashboard.bags')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={s.statCard} 
          activeOpacity={0.8}
          onPress={onKhataPress}
        >
          <Text style={s.statLabel}>{t('dashboard.pending_rent')}</Text>
          <Text style={[s.statValue, { color: '#FCA5A5' }]}>
            ₹{pendingRent.toLocaleString('en-IN')}
          </Text>
          <Text style={s.statSub}>{pendingRent > 0 ? t('dashboard.overdue') : t('dashboard.no_dues')}</Text>
        </TouchableOpacity>
        
        <View style={s.statCard}>
          <Text style={s.statLabel}>{t('dashboard.aging_alerts')}</Text>
          <Text style={[s.statValue, { color: '#FCD34D' }]}>
            {activeAlertsCount}
          </Text>
          <Text style={s.statSub}>{activeAlertsCount > 0 ? t('dashboard.action_needed') : t('dashboard.all_good')}</Text>
        </View>
      </View>
    </View>
  );
}


