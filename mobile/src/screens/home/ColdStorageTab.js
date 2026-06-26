import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { fetchColdStorageSummary, fetchColdStorages, fetchHoldings, fetchWeather } from '../../services/api';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import ErrorCard from '../../components/ErrorCard';
import { getWeatherEmoji, getWeatherGradient } from './helpers';
import CsSelectModal from './modals/CsSelectModal';
import CsRegisterModal from './modals/CsRegisterModal';
import InventoryModal from './modals/InventoryModal';
import layoutStyles from './styles/layoutStyles';
import dashboardStyles from './styles/dashboardStyles';
import storageStyles from './styles/storageStyles';

export default function ColdStorageTab({ setActiveTab }) {
  const [selectedColdStorageId, setSelectedColdStorageId] = useState('cmmp9txv0000ai3t4wush9trs');
  const [csSummary, setCsSummary] = useState(null);
  const [csLoading, setCsLoading] = useState(false);
  const [csError, setCsError] = useState(null);
  const [csWeather, setCsWeather] = useState(null);

  const [coldStoragesList, setColdStoragesList] = useState([]);
  const [coldStoragesLoading, setColdStoragesLoading] = useState(false);

  const [csModalVisible, setCsModalVisible] = useState(false);
  const [csRegisterModalVisible, setCsRegisterModalVisible] = useState(false);

  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);

  useEffect(() => {
    loadColdStorageData(selectedColdStorageId);
    loadColdStoragesList();
  }, [selectedColdStorageId]);

  const loadColdStoragesList = async () => {
    setColdStoragesLoading(true);
    try {
      const storages = await fetchColdStorages();
      setColdStoragesList(storages || []);
    } catch (err) {
      console.warn('Failed to load cold storages list:', err.message);
    } finally {
      setColdStoragesLoading(false);
    }
  };

  const loadColdStorageData = async (csId) => {
    setCsLoading(true);
    setCsError(null);
    try {
      const summary = await fetchColdStorageSummary(csId);
      setCsSummary(summary);
      const cityToQuery = summary.coldStorage.district || summary.coldStorage.city || 'Firozabad';
      try {
        const weather = await fetchWeather(cityToQuery);
        setCsWeather(weather);
      } catch (weatherErr) {
        console.warn('Failed to load weather:', weatherErr.message);
      }
    } catch (err) {
      setCsError(err.message);
      setCsSummary(null);
    } finally {
      setCsLoading(false);
    }
  };

  const handleOpenInventory = async () => {
    setInventoryModalVisible(true);
    setInventoryLoading(true);
    try {
      const holdings = await fetchHoldings();
      setInventoryList(holdings || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load inventory.');
    } finally {
      setInventoryLoading(false);
    }
  };

  return (
    <View style={layoutStyles.tabContent}>
      {csLoading ? (
        <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
      ) : csError ? (
        <ErrorCard message={csError} onRetry={() => loadColdStorageData(selectedColdStorageId)} />
      ) : csSummary ? (
        <View style={{ width: '100%' }}>
          <View style={dashboardStyles.csDashboardHeader}>
            <LinearGradient colors={['#1E4032', '#2D6A4F']} style={dashboardStyles.csHeaderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={dashboardStyles.csHeaderTopRow}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setCsModalVisible(true)} activeOpacity={0.8}>
                    <Text style={dashboardStyles.csHeaderTitle}>{csSummary.coldStorage.name}  ▼</Text>
                  </TouchableOpacity>
                  <Text style={dashboardStyles.csHeaderLocation}>◎ {csSummary.coldStorage.location}</Text>
                </View>
                <TouchableOpacity style={dashboardStyles.csBellBtn} onPress={() => Alert.alert('Alerts', 'No new alerts.')}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                  <View style={dashboardStyles.csBellDot} />
                </TouchableOpacity>
              </View>

              <View style={dashboardStyles.csSummaryRow}>
                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Total Stock</Text>
                  <Text style={dashboardStyles.csSummaryCardValue}>{csSummary.stock.packets} bags</Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>{csSummary.stock.weightMt.toFixed(1)} MT stored</Text>
                </View>
                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Total Dues</Text>
                  <Text style={[dashboardStyles.csSummaryCardValue, { color: '#E53E3E' }]}>₹{csSummary.dues.amount.toLocaleString('en-IN')}</Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>From {csSummary.dues.farmersCount} farmers</Text>
                </View>
                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Today's Amad</Text>
                  <Text style={[dashboardStyles.csSummaryCardValue, { color: COLORS.greenLight }]}>{csSummary.todayAmad.packets} bags</Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>{csSummary.todayAmad.entries} arrivals</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <Text style={dashboardStyles.csSectionTitle}>Facility Actions</Text>
          <View style={dashboardStyles.csGridContainer}>
            {[
              { label: 'Inward (Amad)', icon: '📥', bg: '#E8F5E9', color: '#2E7D32' },
              { label: 'Outward', icon: '📤', bg: '#E3F2FD', color: '#1565C0' },
              { label: 'Dues List', icon: '📒', bg: '#FFF3E0', color: '#E65100' },
              { label: 'Inventory', icon: '📋', bg: '#F3E5F5', color: '#4A148C' },
              { label: 'Mandi Rates', icon: '📈', bg: '#E0F7FA', color: '#006064' },
              { label: 'Onboarding CS', icon: '➕', bg: '#FCE4EC', color: '#C62828' }
            ].map((action, idx) => (
              <TouchableOpacity
                key={action.label + idx}
                style={dashboardStyles.csGridItem}
                onPress={() => {
                  if (action.label === 'Inward (Amad)') setActiveTab('storage');
                  else if (action.label === 'Mandi Rates') setActiveTab('prices');
                  else if (action.label === 'Inventory') handleOpenInventory();
                  else if (action.label === 'Onboarding CS') setCsRegisterModalVisible(true);
                  else Alert.alert(action.label, `${action.label} feature coming soon.`);
                }}
                activeOpacity={0.7}
              >
                <View style={[dashboardStyles.csGridIconContainer, { backgroundColor: action.bg }]}>
                  <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                </View>
                <Text style={dashboardStyles.csGridLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live Mandi Prices */}
          <View style={dashboardStyles.csSectionHeaderRow}>
            <Text style={dashboardStyles.csSectionTitle}>Live Mandi Prices</Text>
            <TouchableOpacity onPress={() => setActiveTab('prices')}>
              <Text style={dashboardStyles.csViewAllText}>View All ›</Text>
            </TouchableOpacity>
          </View>
          <View style={storageStyles.csPricesList}>
            {[
              { commodity: 'Potato (Pukhraj)', location: 'Agra', price: '₹820', trend: '↗ 15', trendColor: '#2E7D32' },
              { commodity: 'Potato (Chipsona)', location: 'Firozabad', price: '₹950', trend: '↘ 20', trendColor: '#C62828' },
              { commodity: 'Onion', location: 'Tundla', price: '₹1100', trend: '↗ 45', trendColor: '#2E7D32' }
            ].map((item, idx) => (
              <View key={item.commodity + idx} style={storageStyles.csPriceItem}>
                <View>
                  <Text style={storageStyles.csPriceName}>{item.commodity}</Text>
                  <Text style={storageStyles.csPriceLoc}>{item.location}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={storageStyles.csPriceVal}>{item.price}</Text>
                  <Text style={[storageStyles.csPriceTrend, { color: item.trendColor }]}>{item.trend}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Modals */}
      <CsSelectModal visible={csModalVisible} onClose={() => setCsModalVisible(false)} coldStoragesList={coldStoragesList} coldStoragesLoading={coldStoragesLoading} selectedColdStorageId={selectedColdStorageId} onSelectColdStorage={setSelectedColdStorageId} onRegisterNew={() => setCsRegisterModalVisible(true)} />
      <CsRegisterModal visible={csRegisterModalVisible} onClose={() => setCsRegisterModalVisible(false)} onRegisterSuccess={(newId) => setSelectedColdStorageId(newId)} />
      <InventoryModal visible={inventoryModalVisible} onClose={() => setInventoryModalVisible(false)} inventoryList={inventoryList} inventoryLoading={inventoryLoading} />
    </View>
  );
}
