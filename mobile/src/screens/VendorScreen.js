import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Dimensions, StatusBar } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnnsetuLogo from '../components/AnnsetuLogo';
import StockTab from './home/StockTab';
import MarketTab from './home/MarketTab';
import NotificationsTab from './home/NotificationsTab';
import ProfileTab from './home/ProfileTab';
import { fetchMandiPrices } from '../services/api';

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
        const { fetchNotifications } = require('../services/notificationService');
        const list = await fetchNotifications('default_vendor');
        if (list && list.length > 0) {
          const hasUnread = list.some(n => !n.isRead);
          setHasUnreadNotifications(hasUnread);
        }
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
              <View>
                <Text style={styles.activityCropName}>Potato — Pukhraj</Text>
                <Text style={styles.activityCSName}>Room 1 / K12 · SN Sharma CS</Text>
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
              <View>
                <Text style={styles.activityCropName}>Potato — Pukhraj</Text>
                <Text style={styles.activityCSName}>Room 1 / B12 · SN Sharma CS</Text>
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
        <NotificationsTab farmerId="default_vendor" onBack={() => setActiveTab('home')} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3EE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B4332',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: '#1E5C2E',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    position: 'relative',
    zIndex: 10,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTextGroup: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 4,
    fontWeight: '500',
  },
  notificationBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F87171',
    borderWidth: 1.5,
    borderColor: '#1E5C2E',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    position: 'relative',
    zIndex: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metricSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#103321',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridItem: {
    width: '31.5%',
    aspectRatio: 1.0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E2D9',
    shadowColor: '#1E4032',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  gridIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E2D9',
    marginBottom: 10,
    shadowColor: '#1E4032',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  priceCropName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  priceLocation: {
    fontSize: 12,
    color: '#7A8B80',
    marginTop: 2,
    fontWeight: '500',
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  priceVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  priceTrend: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E2D9',
    marginBottom: 8,
    shadowColor: '#1E4032',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityCropName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  activityCSName: {
    fontSize: 12,
    color: '#7A8B80',
    marginTop: 2,
    fontWeight: '500',
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  activityGridCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  activityGridLabel: {
    fontSize: 12,
    color: '#7A8B80',
    fontWeight: '500',
  },
  activityGridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },
  weatherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherInfoText: {
    marginLeft: 12,
  },
  weatherLocation: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  weatherStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  weatherRight: {
    alignItems: 'flex-end',
  },
  weatherTemp: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  weatherTempRange: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  footerNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 80 : 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E2D9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 20 : (Platform.OS === 'ios' ? 10 : 0),
  },
  footerTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIconWrapper: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconWrapperActive: {
    backgroundColor: 'rgba(30, 92, 46, 0.1)',
  },
  footerTabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7A8B80',
    marginTop: 4,
  },
  footerTabTextActive: {
    color: '#1E5C2E',
    fontWeight: '700',
  },
});
