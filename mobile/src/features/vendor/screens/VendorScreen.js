import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Dimensions, StatusBar } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import styles from '../styles/vendorScreenStyles';
import StockTab from '../../inventory/screens/StockTab';
import MarketTab from '../../mandi/screens/MarketTab';
import NotificationsTab from '../../notifications/screens/NotificationsTab';
import ProfileTab from '../../farmer/screens/ProfileTab';
import { fetchMandiPrices } from '../../../core/network/api';

const { width } = Dimensions.get('window');

export default function VendorScreen({ onSwitchRole, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  const [mandiPrices, setMandiPrices] = useState([
    { id: '1', commodity: 'Potato', variety: 'Pukhraj', mandi: 'Agra', price: 820, change: 15 },
    { id: '2', commodity: 'Potato', variety: 'Chipsona', mandi: 'Firozabad', price: 950, change: -20 },
    { id: '3', commodity: 'Onion', variety: '', mandi: 'Tundla', price: 1100, change: 45 },
  ]);

  useEffect(() => {
    async function loadLivePrices() {
      try {
        const updatedPrices = [...mandiPrices];

        // 1. Fetch Potato prices for Uttar Pradesh
        try {
          const potatoData = await fetchMandiPrices('Uttar Pradesh', 'Potato');
          const records = potatoData.records || [];

          const agraRec = records.find(r =>
            r.market.toLowerCase().includes('agra') &&
            r.variety.toLowerCase().includes('pukhraj')
          ) || records.find(r => r.market.toLowerCase().includes('agra'));

          if (agraRec) {
            updatedPrices[0] = {
              ...updatedPrices[0],
              price: agraRec.modalPrice || agraRec.maxPrice || 820,
            };
          }

          const firozabadRec = records.find(r =>
            r.market.toLowerCase().includes('firozabad') &&
            r.variety.toLowerCase().includes('chipsona')
          ) || records.find(r => r.market.toLowerCase().includes('firozabad'));

          if (firozabadRec) {
            updatedPrices[1] = {
              ...updatedPrices[1],
              price: firozabadRec.modalPrice || firozabadRec.maxPrice || 950,
            };
          }
        } catch (e) {
          console.warn('Failed to load live potato prices:', e.message);
        }

        // 2. Fetch Onion prices for Uttar Pradesh
        try {
          const onionData = await fetchMandiPrices('Uttar Pradesh', 'Onion');
          const records = onionData.records || [];

          const tundlaRec = records.find(r =>
            r.market.toLowerCase().includes('tundla')
          ) || records.find(r => r.market.toLowerCase().includes('firozabad')) || records[0];

          if (tundlaRec) {
            updatedPrices[2] = {
              ...updatedPrices[2],
              price: tundlaRec.modalPrice || tundlaRec.maxPrice || 1100,
            };
          }
        } catch (e) {
          console.warn('Failed to load live onion prices:', e.message);
        }

        setMandiPrices(updatedPrices);
      } catch (err) {
        console.warn('Error fetching live mandi prices:', err);
      }
    }

    loadLivePrices();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { fetchNotifications } = require('../../notifications/services/notificationService');
        const list = await fetchNotifications('default_vendor');
        const hasUnread = list && list.some(n => !n.isRead);
        setHasUnreadNotifications(!!hasUnread);
      } catch (err) {
        console.warn('VendorScreen background notification poll failed:', err.message);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const renderTabIcon = (name, tabName) => {
    const isActive = activeTab === tabName;
    return (
      <View style={[styles.tabIconWrapper, isActive && styles.tabIconWrapperActive]}>
        <Feather name={name} size={20} color={isActive ? '#1E5C2E' : '#7A8B80'} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status Bar Spacer for Android to push header down */}
      {Platform.OS === 'android' && (
        <View style={{ height: StatusBar.currentHeight, backgroundColor: '#F5F3EE' }} />
      )}

      {activeTab === 'home' ? (
        <>
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={styles.headerTitle}>Annsetu</Text>
            </View>
          </View>

          {/* Main Scroll Content */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Green Hero Banner */}
            <View style={styles.heroBanner}>
              {/* Circular overlays */}
              <View style={[styles.bgCircle, { top: -40, right: -40, width: 160, height: 160 }]} />
              <View style={[styles.bgCircle, { bottom: -32, right: 48, width: 96, height: 96 }]} />

              <View style={styles.profileRow}>
                <View style={styles.profileLeft}>
                  <View style={styles.logoBadge}>
                    <AnnsetuLogo size={24} backgroundColor="transparent" iconColor="#FFFFFF" />
                  </View>
                  <View style={styles.profileTextGroup}>
                    <Text style={styles.roleLabel}>Vendor / व्यापारी</Text>
                    <Text style={styles.profileName}>SN Sharma Trading</Text>
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={11} color="rgba(255, 255, 255, 0.5)" />
                      <Text style={styles.locationText}>Tundla, Firozabad, UP</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.notificationBtn}
                  onPress={() => {
                    setActiveTab('notifications');
                    setHasUnreadNotifications(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="bell" size={18} color="#FFFFFF" />
                  {hasUnreadNotifications && <View style={styles.badgeDot} />}
                </TouchableOpacity>
              </View>

              {/* Metric Cards Row */}
              <View style={styles.metricsRow}>
                {/* Active Sauda */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Active Sauda</Text>
                  <Text style={styles.metricValue}>3</Text>
                  <Text style={styles.metricSubtext}>₹3,60,000</Text>
                </View>
                {/* Pending Due */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Pending Due</Text>
                  <Text style={[styles.metricValue, { color: '#FCA5A5' }]}>₹1,20,000</Text>
                  <Text style={styles.metricSubtext}>2 parties</Text>
                </View>
                {/* In Transit */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>In Transit</Text>
                  <Text style={[styles.metricValue, { color: '#FCD34D' }]}>1</Text>
                  <Text style={styles.metricSubtext}>75 Qt</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions Grid */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.gridContainer}>
                {/* Card 1: Marketplace */}
                <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('market')} activeOpacity={0.7}>
                  <View style={[styles.gridIconBg, { backgroundColor: '#ECFDF5' }]}>
                    <Feather name="shopping-bag" size={18} color="#047857" />
                  </View>
                  <Text style={styles.gridLabel}>Marketplace</Text>
                </TouchableOpacity>

                {/* Card 2: My Orders */}
                <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
                  <View style={[styles.gridIconBg, { backgroundColor: '#EFF6FF' }]}>
                    <Feather name="file-text" size={18} color="#1D4ED8" />
                  </View>
                  <Text style={styles.gridLabel}>My Orders</Text>
                </TouchableOpacity>

                {/* Card 3: Khata */}
                <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
                  <View style={[styles.gridIconBg, { backgroundColor: '#FFFBEB' }]}>
                    <Feather name="book-open" size={18} color="#B45309" />
                  </View>
                  <Text style={styles.gridLabel}>Khata</Text>
                </TouchableOpacity>

                {/* Card 4: Payments */}
                <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
                  <View style={[styles.gridIconBg, { backgroundColor: '#FAF5FF' }]}>
                    <Ionicons name="wallet-outline" size={18} color="#6D28D9" />
                  </View>
                  <Text style={styles.gridLabel}>Payments</Text>
                </TouchableOpacity>

                {/* Card 5: Market Rates */}
                <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('market')} activeOpacity={0.7}>
                  <View style={[styles.gridIconBg, { backgroundColor: '#F0F9FF' }]}>
                    <Feather name="trending-up" size={18} color="#0369A1" />
                  </View>
                  <Text style={styles.gridLabel}>Market Rates</Text>
                </TouchableOpacity>

                {/* Card 6: Reports */}
                <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
                  <View style={[styles.gridIconBg, { backgroundColor: '#FFF1F2' }]}>
                    <Feather name="bar-chart-2" size={18} color="#BE123C" />
                  </View>
                  <Text style={styles.gridLabel}>Reports</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Mandi Prices */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Live Mandi Prices / आज के भाव</Text>
                <TouchableOpacity onPress={() => setActiveTab('market')} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All ›</Text>
                </TouchableOpacity>
              </View>

              {mandiPrices.map((item) => {
                const isTrendUp = item.change > 0;
                return (
                  <View key={item.id} style={styles.priceCard}>
                    <View>
                      <Text style={styles.priceCropName}>
                        {item.commodity}{item.variety ? ` (${item.variety})` : ''}
                      </Text>
                      <Text style={styles.priceLocation}>{item.mandi}</Text>
                    </View>
                    <View style={styles.priceRight}>
                      <Text style={styles.priceVal}>₹{item.price}</Text>
                      <Text style={[styles.priceTrend, { color: isTrendUp ? '#2E7D32' : '#C62828' }]}>
                        {isTrendUp ? `↗ ${item.change}` : `↙ ${Math.abs(item.change)}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Recent Activity */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All ›</Text>
                </TouchableOpacity>
              </View>

              {/* Activity Card 1 */}
              <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.activityCropName}>Potato — Pukhraj</Text>
                    <Text style={styles.activityCSName} numberOfLines={1}>Room 1 / K12 · SN Sharma CS</Text>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.activityBadgeText, { color: '#2E7D32' }]}>Fresh</Text>
                  </View>
                </View>
                <View style={styles.activityGrid}>
                  <View style={styles.activityGridCol}>
                    <Text style={styles.activityGridLabel}>Bags</Text>
                    <Text style={styles.activityGridValue}>300</Text>
                  </View>
                  <View style={styles.activityGridCol}>
                    <Text style={styles.activityGridLabel}>Weight</Text>
                    <Text style={styles.activityGridValue}>15 MT</Text>
                  </View>
                  <View style={styles.activityGridCol}>
                    <Text style={styles.activityGridLabel}>Age</Text>
                    <Text style={styles.activityGridValue}>7d</Text>
                  </View>
                </View>
              </View>

              {/* Activity Card 2 */}
              <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.activityCropName}>Potato — Pukhraj</Text>
                    <Text style={styles.activityCSName} numberOfLines={1}>Room 1 / B12 · SN Sharma CS</Text>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.activityBadgeText, { color: '#1565C0' }]}>Good</Text>
                  </View>
                </View>
                <View style={styles.activityGrid}>
                  <View style={styles.activityGridCol}>
                    <Text style={styles.activityGridLabel}>Bags</Text>
                    <Text style={styles.activityGridValue}>50</Text>
                  </View>
                  <View style={styles.activityGridCol}>
                    <Text style={styles.activityGridLabel}>Weight</Text>
                    <Text style={styles.activityGridValue}>2.5 MT</Text>
                  </View>
                  <View style={styles.activityGridCol}>
                    <Text style={styles.activityGridLabel}>Age</Text>
                    <Text style={styles.activityGridValue}>55d</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Weather Widget */}
            <View style={[styles.sectionContainer, { marginBottom: Platform.OS === 'android' ? 96 : 76 }]}>
              <LinearGradient
                colors={['#0ea5e9', '#2563eb']} // from-sky-500 to-blue-600
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.weatherCard}
              >
                <View style={styles.weatherLeft}>
                  <Feather name="sun" size={32} color="#FFE066" />
                  <View style={styles.weatherInfoText}>
                    <Text style={styles.weatherLocation}>Tundla, Firozabad</Text>
                    <Text style={styles.weatherStatus}>Clear sky · Good for transport</Text>
                  </View>
                </View>
                <View style={styles.weatherRight}>
                  <Text style={styles.weatherTemp}>32°C</Text>
                  <Text style={styles.weatherTempRange}>Max 35°C / Min 24°C</Text>
                </View>
              </LinearGradient>
            </View>

          </ScrollView>
        </>
      ) : activeTab === 'stock' ? (
        <StockTab />
      ) : activeTab === 'market' ? (
        <MarketTab />
      ) : activeTab === 'notifications' ? (
        <NotificationsTab
          farmerId="default_vendor"
          onBack={() => setActiveTab('home')}
          onMarkRead={() => {
            const { fetchNotifications } = require('../../notifications/services/notificationService');
            fetchNotifications('default_vendor').then(list => {
              const hasUnread = list && list.some(n => !n.isRead);
              setHasUnreadNotifications(!!hasUnread);
            }).catch(() => {});
          }}
        />
      ) : activeTab === 'profile' ? (
        <ProfileTab onSwitchRole={onSwitchRole} onLogout={onLogout} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#1E5C2E', fontSize: 16 }}>{activeTab} Tab Content</Text>
        </View>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <View style={styles.footerNav}>
        <TouchableOpacity style={styles.footerTab} onPress={() => setActiveTab('home')} activeOpacity={0.8}>
          {renderTabIcon('home', 'home')}
          <Text style={[styles.footerTabText, activeTab === 'home' && styles.footerTabTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerTab} onPress={() => setActiveTab('stock')} activeOpacity={0.8}>
          {renderTabIcon('package', 'stock')}
          <Text style={[styles.footerTabText, activeTab === 'stock' && styles.footerTabTextActive]}>My Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerTab} onPress={() => setActiveTab('market')} activeOpacity={0.8}>
          {renderTabIcon('trending-up', 'market')}
          <Text style={[styles.footerTabText, activeTab === 'market' && styles.footerTabTextActive]}>Market</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerTab} onPress={() => setActiveTab('khata')} activeOpacity={0.8}>
          {renderTabIcon('book-open', 'khata')}
          <Text style={[styles.footerTabText, activeTab === 'khata' && styles.footerTabTextActive]}>Khata</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerTab} onPress={() => setActiveTab('profile')} activeOpacity={0.8}>
          {renderTabIcon('user', 'profile')}
          <Text style={[styles.footerTabText, activeTab === 'profile' && styles.footerTabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


