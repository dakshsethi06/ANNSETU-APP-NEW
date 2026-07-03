import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FarmerProfile from '../../components/FarmerProfile';
import AnnsetuLogo from '../../components/AnnsetuLogo';
import MandiPricePreview from '../../components/MandiPricePreview';
import styles from './styles/farmerDashboardStyles';
import { supabase } from '../../services/supabase';

const QUICK_ACTIONS = [
  { label: 'My Stock', icon: 'package', bg: '#ECFDF5', color: '#047857' },
  { label: 'Mandi Rates', icon: 'trending-up', bg: '#EFF6FF', color: '#1D4ED8' },
  { label: 'My Khata', icon: 'book-open', bg: '#FFFBEB', color: '#B45309' },
  { label: 'Dispatch', icon: 'truck', bg: '#F5F3FF', color: '#7C3AED' },
  { label: 'Weather', icon: 'cloud', bg: '#F0F9FF', color: '#0284C7' },
  { label: 'Book Space', icon: 'plus-circle', bg: '#FFF1F2', color: '#E11D48' },
];

const BOTTOM_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'stock', label: 'My Stock', icon: 'package' },
  { key: 'market', label: 'Market', icon: 'trending-up' },
  { key: 'khata', label: 'Khata', icon: 'book-open' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

export default function FarmerDashboard({ farmerData, holdingsList = [], notifications, hasUnreadNotifications, weatherData, onBackPress, onNotificationsPress, onActionPress, manualStockMt, manualBags, onUpdateStockPress }) {
  const activeAlertsCount = (notifications || []).filter(n => 
    n.type === 'aging' || 
    (n.type === 'warning' && n.title.toLowerCase().includes('crop'))
  ).length;
  const totalStockMt = holdingsList.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0) * 0.1;
  const totalBags = holdingsList.reduce((sum, h) => sum + (h.bags || 0), 0);
  const pendingRent = parseFloat(farmerData.pendingRent || 0);

  // Status configuration mapping matching the web mockup
  const statusConfig = {
    fresh: { label: 'Fresh', color: '#047857', bg: '#ECFDF5' },
    good: { label: 'Good', color: '#1D4ED8', bg: '#EFF6FF' },
    warning: { label: 'Warning', color: '#B45309', bg: '#FFFBEB' },
    danger: { label: 'Critical', color: '#B91C1C', bg: '#FEF2F2' },
  };

  // Graceful fallback for recent activities
  const recentActivities = holdingsList && holdingsList.length > 0 
    ? holdingsList.slice(0, 2).map((item, index) => {
        let statusStr = 'fresh';
        const age = item.age_days || 7;
        if (age >= 70) statusStr = 'warning';
        else if (age >= 30) statusStr = 'good';
        return {
          id: item.lot_id || `AM-${16288 + index}`,
          commodity: item.crop || 'Potato',
          variety: item.variety || 'Pukhraj',
          location: item.location || 'Room 1 / K12',
          cold_storage: item.cold_storage || 'SN Sharma CS',
          bags: item.bags || 300,
          weight: item.weight || `${(item.bags || 300) * 0.05} MT`,
          age_days: age,
          status: statusStr,
        };
      })
    : [];

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity onPress={onBackPress} activeOpacity={0.8}>
            <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          </TouchableOpacity>
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
      </View>

      {/* ─── Scrollable Content ─── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Farmer Profile Card */}
        <FarmerProfile
          farmerData={farmerData}
          totalStockMt={manualStockMt !== undefined ? manualStockMt : totalStockMt}
          totalBags={manualBags !== undefined ? manualBags : totalBags}
          pendingRent={pendingRent}
          activeAlertsCount={activeAlertsCount}
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationsPress={onNotificationsPress}
          onUpdateStockPress={onUpdateStockPress}
        />


        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionCard}
              onPress={() => onActionPress(action.label)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: action.bg }]}>
                <Feather name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Mandi Prices */}
        <MandiPricePreview
          farmerState={farmerData.state || 'Uttar Pradesh'}
          onViewAll={() => onActionPress('Mandi Rates')}
        />

        {/* Recent Activity Section */}
        <View style={styles.recentActivityHeader}>
          <Text style={styles.recentActivityTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => onActionPress('My Stock')} activeOpacity={0.7}>
            <Text style={styles.recentActivityViewAll}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        {recentActivities.length === 0 ? (
          <View style={{
            padding: 24,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            borderStyle: 'dashed',
            borderWidth: 1,
            borderColor: 'rgba(30, 92, 46, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
          }}>
            <Text style={{ fontSize: 13, color: '#6B7B6B', fontWeight: '500' }}>No recent activity / कोई हालिया गतिविधि नहीं</Text>
          </View>
        ) : (
          recentActivities.map((act) => {
            const cfg = statusConfig[act.status] || statusConfig.fresh;
            return (
              <View key={act.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View>
                    <Text style={styles.activityTitleText}>{act.commodity} — {act.variety}</Text>
                    <Text style={styles.activitySubtitleText}>{act.location} · {act.cold_storage}</Text>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.activityBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <View style={styles.activityStatsGrid}>
                  <View style={styles.activityStatCol}>
                    <Text style={styles.activityStatLabel}>Bags</Text>
                    <Text style={styles.activityStatValue}>{act.bags}</Text>
                  </View>
                  <View style={styles.activityStatCol}>
                    <Text style={styles.activityStatLabel}>Weight</Text>
                    <Text style={styles.activityStatValue}>{act.weight}</Text>
                  </View>
                  <View style={styles.activityStatCol}>
                    <Text style={styles.activityStatLabel}>Age</Text>
                    <Text style={styles.activityStatValue}>{act.age_days}d</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Weather Widget */}
        <TouchableOpacity 
          style={styles.weatherContainer} 
          onPress={() => onActionPress('Weather')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#0EA5E9', '#2563EB']}
            style={styles.weatherGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Feather name="sun" size={32} color="#FCD34D" />
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherLoc}>
                {weatherData ? weatherData.location : `${farmerData.village || farmerData.district || 'Tundla'}, ${farmerData.state || 'UP'}`}
              </Text>
              <Text style={styles.weatherDesc}>
                {weatherData ? `${weatherData.description} · Humidity: ${weatherData.humidity}%` : 'Weather loading / clear sky'}
              </Text>
            </View>
            <View style={styles.weatherRight}>
              <Text style={styles.weatherTemp}>
                {weatherData ? `${Math.round(weatherData.temp)}°C` : '32°C'}
              </Text>
              <Text style={styles.weatherRange}>
                {weatherData && weatherData.forecast && weatherData.forecast.length > 0
                  ? `Max ${weatherData.forecast[0].maxTemp}° / Min ${weatherData.forecast[0].minTemp}°`
                  : 'Max 35° / Min 24°'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


