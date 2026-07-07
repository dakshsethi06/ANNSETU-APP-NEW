import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import StockTab from '../../inventory/screens/StockTab';
import MandiTab from '../../mandi/screens/MandiTab';
import KhataTab from '../../farmer/screens/KhataTab';
import NotificationsTab from '../../notifications/screens/NotificationsTab';
import ProfileTab from '../../farmer/screens/ProfileTab';
import CreateRequestTab from '../../farmer/screens/CreateRequestTab';
import { fetchWeather } from '../../weather/services/weatherService';
import MandiPricePreview from '../../mandi/components/MandiPricePreview';
import styles from '../../farmer/styles/farmerDashboardStyles';
import layoutStyles from '../../farmer/styles/layoutStyles';
import localStyles from '../styles/coldStorageScreenStyles';
import { FONTS } from '../../../core/theme/theme';

const QUICK_ACTIONS = [
  { label: 'Amad', icon: 'arrow-down-left', bg: '#ECFDF5', color: '#047857' },
  { label: 'Nikasi', icon: 'truck', bg: '#EFF6FF', color: '#1D4ED8' },
  { label: 'Inventory', icon: 'package', bg: '#FFFBEB', color: '#B45309' },
  { label: 'Billing', icon: 'file-text', bg: '#F5F3FF', color: '#7C3AED' },
  { label: 'Manage Request', icon: 'plus', bg: '#FFF1F2', color: '#E11D48' },
  { label: 'Gate Pass', icon: 'clipboard', bg: '#FEF2F2', color: '#B91C1C' },
];

const statusConfig = {
  fresh: { label: 'Fresh', color: '#047857', bg: '#ECFDF5' },
  good: { label: 'Good', color: '#1D4ED8', bg: '#EFF6FF' },
  warning: { label: 'Warning', color: '#B45309', bg: '#FFFBEB' },
  danger: { label: 'Critical', color: '#B91C1C', bg: '#FEF2F2' },
};

export default function ColdStorageScreen({ loggedInPhone, onSwitchRole, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const [holdingsList, setHoldingsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [ledgerList, setLedgerList] = useState([]);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const [profile, setProfile] = useState({
    id: 'cmmp9txv0000ai3t4wush9trs',
    name: 'Loading...',
    location: 'Loading...',
    state: 'Uttar Pradesh',
  });
  const [stats, setStats] = useState({
    totalStockText: '0 MT',
    totalStockSub: '0 pkts',
    pendingDuesText: '₹0',
    pendingDuesSub: '0 farmers',
    todayAmadText: '0',
    todayAmadSub: 'entries',
  });

  useEffect(() => {
    async function loadAllData() {
      try {
        const { fetchColdStorages, fetchColdStorageSummary } = require('../services/storageService');
        const { fetchHoldings } = require('../../mandi/services/amadService');
        const { fetchNotifications } = require('../../notifications/services/notificationService');
        const { fetchFarmerLedger } = require('../../farmer/services/farmerService');

        const list = await fetchColdStorages();

        let targetId = null;
        let locationName = 'Tundla';

        console.log('[DEBUG] loggedInPhone received:', loggedInPhone);
        console.log('[DEBUG] cold storages list:', list.map(cs => ({ id: cs.id, phone: cs.phone })));

        if (loggedInPhone) {
          const cleanPhone = loggedInPhone.replace('+91', '').trim();
          console.log('[DEBUG] cleanPhone:', cleanPhone);
          const matched = list.find(cs => cs.phone && cs.phone.trim() === cleanPhone);
          console.log('[DEBUG] matched cold storage:', matched);
          if (matched) {
            targetId = matched.id;
            locationName = matched.city || matched.district || 'Tundla';
          }
        }

        if (!targetId) {
          setProfile({
            id: 'NEW_CS',
            name: 'New Cold Storage',
            location: 'Not Assigned',
            state: 'Uttar Pradesh',
          });
          setStats({
            totalStockText: '0 MT',
            totalStockSub: '0 pkts',
            pendingDuesText: '₹0',
            pendingDuesSub: '0 farmers',
            todayAmadText: '0',
            todayAmadSub: 'entries',
          });
          setHoldingsList([]);
          setNotifications([]);
          setLedgerList([]);
          setLoading(false);
          return;
        }

        const [summary, weather, holdings, notifs, ledger] = await Promise.all([
          fetchColdStorageSummary(targetId).catch(() => null),
          fetchWeather(locationName).catch(() => null),
          fetchHoldings().catch(() => []),
          fetchNotifications(targetId).catch(() => []),
          fetchFarmerLedger(targetId).catch(() => []),
        ]);

        if (summary) {
          setProfile({
            id: summary.coldStorage.id,
            name: summary.coldStorage.name,
            location: `${summary.coldStorage.city || 'Tundla'}, ${summary.coldStorage.district || 'Firozabad'}, ${summary.coldStorage.state || 'UP'}`,
            state: summary.coldStorage.state || 'Uttar Pradesh',
          });
          setStats({
            totalStockText: `${(summary.stock.packets * 0.05).toFixed(1)} MT`,
            totalStockSub: `${summary.stock.packets} pkts`,
            pendingDuesText: `₹${summary.dues.amount.toLocaleString('en-IN')}`,
            pendingDuesSub: `${summary.dues.farmersCount} farmers`,
            todayAmadText: `${summary.todayAmad.entries}`,
            todayAmadSub: 'entries',
          });
        }

        const filteredHoldings = (holdings || [])
          .filter(h => h.cold_storage_id === targetId)
          .map((h, index) => {
            let statusStr = 'fresh';
            const age = h.age_days || 7;
            if (age >= 90) statusStr = 'danger';
            else if (age >= 70) statusStr = 'warning';
            else if (age >= 30) statusStr = 'good';
            return {
              ...h,
              id: h.lot_id || `AM-${16288 + index}`,
              commodity: h.crop || 'Potato',
              variety: h.variety || 'Pukhraj',
              location: h.location || 'Room 1 / K12',
              cold_storage: h.cold_storage || (summary ? summary.coldStorage.name : 'SN Sharma CS'),
              bags: h.bags || 300,
              weight: h.weight || `${(h.bags || 300) * 0.05} MT`,
              age_days: age,
              status: statusStr,
            };
          });
        setHoldingsList(filteredHoldings);
        setNotifications(notifs || []);
        setLedgerList(ledger || []);

        if (weather) {
          setWeatherData(weather);
        }
      } catch (err) {
        console.warn('Failed to load dashboard data:', err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, [loggedInPhone]);

  useEffect(() => {
    if (!profile.id || profile.id === 'Loading...' || profile.id === 'NEW_CS') return;

    const { subscribeToNotifications } = require('../../notifications/services/notificationService');

    const unsubscribe = subscribeToNotifications(
      profile.id,
      (newNotif) => {
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [{
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            createdAt: newNotif.createdAt,
            isRead: newNotif.isRead,
            timeLabel: 'Just now',
            actionUrl: newNotif.actionUrl
          }, ...prev];
        });
      },
      (updatedNotif) => {
        setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? { ...n, isRead: updatedNotif.isRead } : n));
      },
      (deletedNotif) => {
        setNotifications(prev => prev.filter(n => n.id !== deletedNotif.id));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [profile.id]);


  const handleQuickAction = (label) => {
    if (label === 'Manage Request') {
      setActiveTab('createRequest');
    } else {
      Alert.alert(label, `${label} action clicked!`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[layoutStyles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F0' }]}>
        <ActivityIndicator size="large" color="#1E5C2E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={layoutStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />

      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {activeTab === 'home' ? (
            <>
              {/* Top Brand Header */}
              <View style={styles.topHeader}>
                <View style={styles.topHeaderLeft}>
                  <TouchableOpacity activeOpacity={0.8}>
                    <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
                  </TouchableOpacity>
                  <Text style={styles.brandTitle}>Annsetu</Text>
                </View>
              </View>

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Green Hero Profile Card Section */}
                <View style={localStyles.heroContainer}>
                  {/* Absolute decorative background circles */}
                  <View style={localStyles.circleTopRight} />
                  <View style={localStyles.circleBottomRight} />

                  {/* Top Header Row */}
                  <View style={localStyles.headerRow}>
                    <View style={localStyles.profileInfo}>
                      <View style={localStyles.logoBox}>
                        <AnnsetuLogo size={24} backgroundColor="transparent" iconColor="#1E5C2E" />
                      </View>
                      <View style={localStyles.textContainer}>
                        <Text style={localStyles.roleLabel}>Cold Storage Manager / प्रबंधक</Text>
                        <Text style={localStyles.nameText}>{profile.name}</Text>
                        <View style={localStyles.locationRow}>
                          <Feather name="map-pin" size={11} color="rgba(255, 255, 255, 0.5)" />
                          <Text style={localStyles.locationText}>{profile.location}</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={localStyles.bellButton}
                      onPress={() => {
                        setActiveTab('notifications');
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="bell" size={18} color="#FFFFFF" />
                      {notifications.filter(n => !n.isRead).length > 0 && <View style={localStyles.redDot} />}
                    </TouchableOpacity>
                  </View>

                  {/* Stats Row */}
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardLabel}>Total Stock</Text>
                      <Text style={styles.summaryCardValue}>{stats.totalStockText}</Text>
                      <Text style={styles.summaryCardSub}>{stats.totalStockSub}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardLabel}>Pending Dues</Text>
                      <Text style={[styles.summaryCardValue, { color: '#FCA5A5' }]}>{stats.pendingDuesText}</Text>
                      <Text style={styles.summaryCardSub}>{stats.pendingDuesSub}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardLabel}>Today Amad</Text>
                      <Text style={styles.summaryCardValue}>{stats.todayAmadText}</Text>
                      <Text style={styles.summaryCardSub}>{stats.todayAmadSub}</Text>
                    </View>
                  </View>
                </View>

                {/* Quick Actions Grid */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  {QUICK_ACTIONS.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      style={styles.quickActionCard}
                      onPress={() => handleQuickAction(action.label)}
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
                  farmerState={profile.state || 'Uttar Pradesh'}
                  onViewAll={() => setActiveTab('market')}
                />

                {/* Recent Activity Section */}
                <View style={styles.recentActivityHeader}>
                  <Text style={styles.recentActivityTitle}>Recent Activity</Text>
                  <TouchableOpacity onPress={() => setActiveTab('stock')} activeOpacity={0.7}>
                    <Text style={styles.recentActivityViewAll}>View All &gt;</Text>
                  </TouchableOpacity>
                </View>

                {holdingsList.length === 0 ? (
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
                  holdingsList.slice(0, 2).map((act) => {
                    const cfg = statusConfig[act.status] || statusConfig.fresh;
                    return (
                      <View key={act.id} style={styles.activityCard}>
                        <View style={styles.activityHeader}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.activityTitleText}>{act.commodity} — {act.variety}</Text>
                            <Text style={styles.activitySubtitleText} numberOfLines={1}>{act.location} · {act.cold_storage}</Text>
                          </View>
                          <View style={[styles.activityBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.activityBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        </View>

                        <View style={styles.activityStatsGrid}>
                          <View style={styles.activityStatCol}>
                            <Text style={styles.activityStatLabel}>Bags</Text>
                            <Text style={styles.activityStatValue}>{act.bags} bags</Text>
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
                  onPress={() => handleQuickAction('Weather')}
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
                        {weatherData ? weatherData.location : profile.location}
                      </Text>
                      <Text style={styles.weatherDesc}>
                        {weatherData ? `${weatherData.description} · Humidity: ${weatherData.humidity}%` : 'Sunny · Humidity: 45%'}
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
            </>
          ) : activeTab === 'createRequest' ? (
            <CreateRequestTab onBackPress={() => setActiveTab('home')} coldStorageId={profile.id} />
          ) : activeTab === 'stock' ? (
            <StockTab holdingsList={holdingsList} disableFallback={true} />
          ) : activeTab === 'market' ? (
            <MandiTab defaultState={profile.state || 'Uttar Pradesh'} />
          ) : activeTab === 'khata' ? (
            <KhataTab
              farmerData={{ name: profile.name, pendingRent: stats.pendingDuesText.replace('₹', '').replace(/,/g, '') }}
              ledgerList={ledgerList}
              holdingsList={holdingsList}
              userRole="coldstorage"
            />
          ) : activeTab === 'notifications' ? (
            <NotificationsTab
              farmerId={profile.id}
              onBack={() => setActiveTab('home')}
              onMarkRead={() => {
                const { fetchNotifications } = require('../../notifications/services/notificationService');
                fetchNotifications(profile.id).then(list => setNotifications(list || [])).catch(() => {});
              }}
            />
          ) : activeTab === 'profile' ? (
            <ProfileTab
              farmerData={{ name: profile.name, phone: loggedInPhone }}
              onSwitchRole={onSwitchRole}
              onLogout={onLogout}
              loggedInPhone={loggedInPhone}
              userRole="ColdStorage"
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#1E5C2E', fontSize: 16 }}>{activeTab} Tab Content</Text>
            </View>
          )}
        </View>

        {/* ─── Elevated Bottom Tab Navigation ─── */}
        {!isKeyboardVisible && activeTab !== 'notifications' && activeTab !== 'createRequest' && (
          <View style={layoutStyles.bottomNav}>
            {/* Tab 1: Home */}
            <TouchableOpacity
              style={layoutStyles.bottomNavTab}
              onPress={() => setActiveTab('home')}
              activeOpacity={0.7}
            >
              <View style={[layoutStyles.iconWrapper, activeTab === 'home' && layoutStyles.iconWrapperActive]}>
                <Feather name="home" size={activeTab === 'home' ? 20 : 19} color={activeTab === 'home' ? '#1E5C2E' : '#71717A'} />
              </View>
              <Text style={[layoutStyles.bottomNavLabel, activeTab === 'home' && layoutStyles.bottomNavLabelActive]}>Home</Text>
            </TouchableOpacity>

            {/* Tab 2: My Stock */}
            <TouchableOpacity
              style={layoutStyles.bottomNavTab}
              onPress={() => setActiveTab('stock')}
              activeOpacity={0.7}
            >
              <View style={[layoutStyles.iconWrapper, activeTab === 'stock' && layoutStyles.iconWrapperActive]}>
                <Feather name="package" size={activeTab === 'stock' ? 20 : 19} color={activeTab === 'stock' ? '#1E5C2E' : '#71717A'} />
              </View>
              <Text style={[layoutStyles.bottomNavLabel, activeTab === 'stock' && layoutStyles.bottomNavLabelActive]}>My Stock</Text>
            </TouchableOpacity>

            {/* Tab 3: Market */}
            <TouchableOpacity
              style={layoutStyles.bottomNavTab}
              onPress={() => setActiveTab('market')}
              activeOpacity={0.7}
            >
              <View style={[layoutStyles.iconWrapper, activeTab === 'market' && layoutStyles.iconWrapperActive]}>
                <Feather name="trending-up" size={activeTab === 'market' ? 20 : 19} color={activeTab === 'market' ? '#1E5C2E' : '#71717A'} />
              </View>
              <Text style={[layoutStyles.bottomNavLabel, activeTab === 'market' && layoutStyles.bottomNavLabelActive]}>Market</Text>
            </TouchableOpacity>

            {/* Tab 4: Khata */}
            <TouchableOpacity
              style={layoutStyles.bottomNavTab}
              onPress={() => setActiveTab('khata')}
              activeOpacity={0.7}
            >
              <View style={[layoutStyles.iconWrapper, activeTab === 'khata' && layoutStyles.iconWrapperActive]}>
                <Feather name="book-open" size={activeTab === 'khata' ? 20 : 19} color={activeTab === 'khata' ? '#1E5C2E' : '#71717A'} />
              </View>
              <Text style={[layoutStyles.bottomNavLabel, activeTab === 'khata' && layoutStyles.bottomNavLabelActive]}>Khata</Text>
            </TouchableOpacity>

            {/* Tab 5: Profile */}
            <TouchableOpacity
              style={layoutStyles.bottomNavTab}
              onPress={() => setActiveTab('profile')}
              activeOpacity={0.7}
            >
              <View style={[layoutStyles.iconWrapper, activeTab === 'profile' && layoutStyles.iconWrapperActive]}>
                <Feather name="user" size={activeTab === 'profile' ? 20 : 19} color={activeTab === 'profile' ? '#1E5C2E' : '#71717A'} />
              </View>
              <Text style={[layoutStyles.bottomNavLabel, activeTab === 'profile' && layoutStyles.bottomNavLabelActive]}>Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}


