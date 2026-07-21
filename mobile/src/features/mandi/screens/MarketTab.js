import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert, Platform, StatusBar, SafeAreaView, ActivityIndicator, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../../../core/theme/theme';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import s from '../styles/marketTabStyles';
import { fetchMandiPrices } from '../services/mandiService';

export default function MarketTab() {
  const [selectedSubTab, setSelectedSubTab] = useState('mandi'); // 'mandi' or 'auction'
  const [selectedCategory, setSelectedCategory] = useState('All'); // 'All', 'Potato', 'Onion', 'Garlic', 'Tomato'
  const [loading, setLoading] = useState(false);
  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const [fetchedDate, setFetchedDate] = useState(getTodayDateString());

  const categories = ['All', 'Potato', 'Onion', 'Garlic', 'Tomato'];

  const [rates, setRates] = useState([
    { id: '1', commodity: 'Potato', variety: 'Pukhraj', mandi: 'Agra Mandi', price: 820, change: 15, pct: 50 },
    { id: '2', commodity: 'Potato', variety: 'Chipsona', mandi: 'Firozabad Mandi', price: 950, change: -20, pct: 60 },
    { id: '3', commodity: 'Onion', variety: '', mandi: 'Tundla Mandi', price: 1100, change: 45, pct: 80 },
    { id: '4', commodity: 'Garlic', variety: '', mandi: 'Agra Mandi', price: 3200, change: 80, pct: 100 },
    { id: '5', commodity: 'Tomato', variety: '', mandi: 'Firozabad Mandi', price: 680, change: -30, pct: 70 },
    { id: '6', commodity: 'Carrot', variety: '', mandi: 'Mathura Mandi', price: 420, change: 10, pct: 45 },
  ]);
  const spinValue = useRef(new Animated.Value(0)).current;

  const handleRefresh = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();

    fetchAllPrices();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const filterLatestDateRecords = (records) => {
    if (!records || records.length === 0) return [];
    const dateMap = {};
    records.forEach(r => {
      if (r.arrivalDate && r.arrivalDate !== '-') {
        const parts = r.arrivalDate.split('/');
        if (parts.length === 3) {
          const timestamp = new Date(parts[2], parts[1] - 1, parts[0]).getTime();
          if (!isNaN(timestamp)) {
            if (!dateMap[timestamp]) dateMap[timestamp] = [];
            dateMap[timestamp].push(r);
          }
        }
      }
    });

    const timestamps = Object.keys(dateMap).map(Number);
    if (timestamps.length === 0) return records;

    const latestTimestamp = Math.max(...timestamps);
    return dateMap[latestTimestamp];
  };

  const fetchAllPrices = async () => {
    setLoading(true);
    try {
      const updatedRates = [...rates];

      const promises = [
        fetchMandiPrices('Uttar Pradesh', 'Potato').then(res => {
          const records = filterLatestDateRecords(res.records || []);
          const agra = records.find(r => r.market.toLowerCase().includes('agra'));
          if (agra) updatedRates[0].price = agra.modalPrice || agra.maxPrice || 820;
          const firozabad = records.find(r => r.market.toLowerCase().includes('firozabad'));
          if (firozabad) updatedRates[1].price = firozabad.modalPrice || firozabad.maxPrice || 950;
        }).catch(() => null),

        fetchMandiPrices('Uttar Pradesh', 'Onion').then(res => {
          const records = filterLatestDateRecords(res.records || []);
          const tundla = records.find(r => r.market.toLowerCase().includes('tundla')) || records[0];
          if (tundla) updatedRates[2].price = tundla.modalPrice || tundla.maxPrice || 1100;
        }).catch(() => null),

        fetchMandiPrices('Uttar Pradesh', 'Garlic').then(res => {
          const records = filterLatestDateRecords(res.records || []);
          const agra = records.find(r => r.market.toLowerCase().includes('agra')) || records[0];
          if (agra) updatedRates[3].price = agra.modalPrice || agra.maxPrice || 3200;
        }).catch(() => null),

        fetchMandiPrices('Uttar Pradesh', 'Tomato').then(res => {
          const records = filterLatestDateRecords(res.records || []);
          const firozabad = records.find(r => r.market.toLowerCase().includes('firozabad')) || records[0];
          if (firozabad) updatedRates[4].price = firozabad.modalPrice || firozabad.maxPrice || 680;
        }).catch(() => null),

        fetchMandiPrices('Uttar Pradesh', 'Carrot').then(res => {
          const records = filterLatestDateRecords(res.records || []);
          const mathura = records.find(r => r.market.toLowerCase().includes('mathura')) || records[0];
          if (mathura) updatedRates[5].price = mathura.modalPrice || mathura.maxPrice || 420;
        }).catch(() => null),
      ];

      await Promise.all(promises);
      setFetchedDate(getTodayDateString());
      setRates(updatedRates);
    } catch (err) {
      console.warn('Failed to load all prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPrices();
  }, []);

  // Filter rates by selected category pill
  const filteredRates = rates.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.commodity.toLowerCase() === selectedCategory.toLowerCase();
  });

  const renderRateCard = ({ item }) => {
    const isTrendUp = item.change > 0;
    return (
      <View style={s.card}>
        <View style={s.cardTopRow}>
          <View style={s.cardLeftInfo}>
            <Text style={s.cardTitle}>
              {item.commodity}{item.variety ? ` (${item.variety})` : ''}
            </Text>
            <View style={s.mandiLocationRow}>
              <Feather name="map-pin" size={12} color="#71717A" style={{ marginRight: 4 }} />
              <Text style={s.mandiLocationText}>{item.mandi}</Text>
            </View>
            <Text style={s.unitText}>per qtl</Text>
          </View>

          <View style={s.cardRightPrices}>
            <Text style={s.priceVal}>₹{item.price}</Text>
            <Text style={[s.trendText, { color: isTrendUp ? '#047857' : '#B91C1C' }]}>
              {isTrendUp ? `↗ +${item.change}` : `↙ -${Math.abs(item.change)}`}
            </Text>
          </View>
        </View>

        {/* Dynamic Progress Accent Track */}
        <View style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              {
                width: `${item.pct}%`,
                backgroundColor: isTrendUp ? '#0ea5e9' : '#EF4444'
              }
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safeArea}>
      {/* Status Bar Spacer for Android */}
      {Platform.OS === 'android' && (
        <View style={{ height: StatusBar.currentHeight, backgroundColor: '#F5F3EE' }} />
      )}

      <View style={s.container}>
        {/* Top Header */}
        <View style={s.topHeader}>
          <View style={s.topHeaderLeft}>
            <View style={s.shieldIcon}>
              <AnnsetuLogo size={22} backgroundColor="transparent" iconColor="#FFFFFF" />
            </View>
            <Text style={s.brandTitle}>Annsetu</Text>
          </View>
          <TouchableOpacity
            style={s.searchIconBtn}
            onPress={() => Alert.alert('Search', 'Search market rates...')}
            activeOpacity={0.8}
          >
            <Feather name="search" size={18} color="#1E5C2E" />
          </TouchableOpacity>
        </View>

        <View style={s.divider} />

        {/* FlatList container for rates */}
        <FlatList
          data={filteredRates}
          keyExtractor={(item) => item.id}
          renderItem={renderRateCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.listHeader}>
              {/* ── Sub-Tab Switcher (Mandi Rates vs Auction Prices) ── */}
              <View style={s.subTabContainer}>
                <TouchableOpacity
                  style={[s.subTabButton, selectedSubTab === 'mandi' && s.subTabButtonActive]}
                  onPress={() => setSelectedSubTab('mandi')}
                  activeOpacity={0.9}
                >
                  <Text style={[s.subTabText, selectedSubTab === 'mandi' && s.subTabTextActive]}>
                    Mandi Rates
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.subTabButton, selectedSubTab === 'auction' && s.subTabButtonActive]}
                  onPress={() => setSelectedSubTab('auction')}
                  activeOpacity={0.9}
                >
                  <Text style={[s.subTabText, selectedSubTab === 'auction' && s.subTabTextActive]}>
                    Auction Prices
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Category Pill Filters ScrollView ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.categoriesScroll}
              >
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.categoryPill, isActive && s.categoryPillActive]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.categoryPillText, isActive && s.categoryPillTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── Sub-header with Date & Refresh ── */}
              <View style={s.subHeaderRow}>
                <View style={s.dateGroup}>
                  <Feather name="calendar" size={14} color="#71717A" style={{ marginRight: 6 }} />
                  <Text style={s.subHeaderText}>{fetchedDate}</Text>
                </View>

                <TouchableOpacity
                  style={s.refreshBtn}
                  onPress={handleRefresh}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{ transform: [{ rotate: spin }], marginRight: 4 }}>
                    <Feather name="refresh-cw" size={13} color="#1E5C2E" />
                  </Animated.View>
                  <Text style={s.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Feather name="trending-up" size={40} color="#A1A1AA" />
              <Text style={s.emptyText}>No rates found for {selectedCategory}</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
