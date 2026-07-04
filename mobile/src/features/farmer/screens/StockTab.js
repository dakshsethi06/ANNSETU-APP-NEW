import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Platform, StatusBar, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../../../core/theme/theme';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';

export default function StockTab({ holdingsList = [], manualStockMt, manualBags, onUpdateStockPress, disableFallback = false }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Graceful fallback for mock stock data if database is empty
  const stockData = holdingsList && holdingsList.length > 0
    ? holdingsList.map((item, index) => {
      let statusStr = 'fresh';
      const age = item.age_days || 7;
      if (age >= 90) statusStr = 'danger';
      else if (age >= 70) statusStr = 'warning';
      else if (age >= 30) statusStr = 'good';
      return {
        id: item.lot_id || `AM-${16288 + index}`,
        commodity: item.crop || 'Potato',
        variety: item.variety || 'Pukhraj',
        storage: item.cold_storage || 'SN Sharma CS',
        room: item.location || 'Room 1 / K12',
        bags: item.bags || 300,
        weight: item.weight || `${(item.bags || 300) * 0.05} MT`,
        age: age,
        status: statusStr,
      };
    })
    : [];

  // Calculations for summary stats
  const totalBags = manualBags !== undefined && manualBags !== null ? manualBags : stockData.reduce((sum, item) => sum + item.bags, 0);
  const totalWeightMt = manualStockMt !== undefined && manualStockMt !== null ? manualStockMt : stockData.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
  const agingAlertsCount = stockData.filter(item => item.age >= 70).length;

  // Filter list by search query
  const filteredList = stockData.filter(item =>
    item.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.room.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Status mapping matching tailwind statusConfig
  const statusConfig = {
    fresh: { label: "Fresh", color: "#047857", bg: "#ECFDF5", dot: "#10B981" },
    good: { label: "Good", color: "#1D4ED8", bg: "#EFF6FF", dot: "#3B82F6" },
    warning: { label: "Warning", color: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" },
    danger: { label: "Critical", color: "#B91C1C", bg: "#FEF2F2", dot: "#EF4444" },
  };

  const renderStockCard = ({ item }) => {
    const cfg = statusConfig[item.status] || statusConfig.fresh;
    const isWarning = item.status === 'warning';

    return (
      <View style={s.card}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <View style={s.idBadge}>
            <Text style={s.idText}>{item.id}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.cardTitle}>{item.commodity} — {item.variety}</Text>
        <Text style={s.cardSubtitle}>{item.storage} · {item.room}</Text>

        {/* Stats Grid - 4 Columns matching Mockup */}
        <View style={s.gridRow}>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>Bags</Text>
            <Text style={s.gridValue}>{item.bags}</Text>
          </View>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>Weight</Text>
            <Text style={s.gridValue}>{item.weight}</Text>
          </View>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>Age</Text>
            <Text style={s.gridValue}>{item.age} days</Text>
          </View>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>Age</Text>
            <Text style={[s.gridValue, item.age > 60 ? { color: '#D97706' } : {}]}>
              {item.age}d
            </Text>
          </View>
        </View>

        {/* Amber Alert Banner if nearing 90 days */}
        {isWarning && (
          <View style={s.alertBanner}>
            <Feather name="alert-triangle" size={14} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={s.alertText}>
              Stock nearing 90 days. Consider dispatch or sell.
            </Text>
          </View>
        )}

        {/* Buttons */}
        <View style={s.buttonsRow}>
          <TouchableOpacity
            style={s.btnSecondary}
            onPress={() => Alert.alert('Stock Details', `Lot ${item.id}\nCrop: ${item.commodity}\nVariety: ${item.variety}\nStored at: ${item.storage}`)}
            activeOpacity={0.7}
          >
            <Text style={s.btnSecondaryText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => Alert.alert('Request Dispatch', `Dispatch requested for lot ${item.id}`)}
            activeOpacity={0.8}
          >
            <Text style={s.btnPrimaryText}>Request Dispatch</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* ─── Top Brand Header ─── */}
      <View style={s.topHeader}>
        <View style={s.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={s.brandTitle}>Annsetu</Text>
        </View>
        <TouchableOpacity
          style={s.searchIconBtn}
          onPress={() => Alert.alert('Search', 'Search is active.')}
          activeOpacity={0.8}
        >
          <Feather name="search" size={18} color="#1E5C2E" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Divider Line */}
      <View style={s.divider} />

      {/* ─── Main Content ─── */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderStockCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.listHeader}>
            {/* ── Summary Stats ── */}
            <View style={s.summaryRow}>
              <TouchableOpacity
                style={s.statCard}
                onPress={onUpdateStockPress}
                activeOpacity={0.8}
              >
                <Text style={s.statLabel}>Total Stock</Text>
                <Text style={s.statValue}>{totalWeightMt.toFixed(1)} MT</Text>
                <Text style={s.statSub}>{totalBags} bags</Text>
              </TouchableOpacity>

              <View style={[s.statCard, s.statCardAccent]}>
                <Text style={s.statLabelAccent}>Aging Alerts</Text>
                <Text style={s.statValueAccent}>{agingAlertsCount}</Text>
                <Text style={s.statSubAccent}>{agingAlertsCount >= 1 ? 'Need attention' : 'All good'}</Text>
              </View>
            </View>

            {/* ── Search and Filter ── */}
            <View style={s.searchContainer}>
              <View style={s.searchBar}>
                <Feather name="search" size={16} color="#71717A" style={{ marginRight: 8 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search inventory..."
                  placeholderTextColor="#A1A1AA"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  style={s.filterBtn}
                  onPress={() => Alert.alert('Filter', 'Show filter controls')}
                  activeOpacity={0.7}
                >
                  <Feather name="filter" size={12} color="#1E5C2E" style={{ marginRight: 4 }} />
                  <Text style={s.filterText}>Filter</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Legend Dot Labels ── */}
            <View style={s.legendRow}>
              {Object.entries(statusConfig).map(([k, v]) => (
                <View key={k} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: v.dot }]} />
                  <Text style={s.legendText}>{v.label}</Text>
                </View>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="package" size={40} color="#A1A1AA" />
            <Text style={s.emptyText}>
              {stockData.length === 0 ? 'No stock data available' : 'No inventory records match your search'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 24) : 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3EE',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12, // squircle rounded-xl
    backgroundColor: '#1E5C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  searchIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(30, 92, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },

  // Main scroll content inside list header
  listHeader: {
    paddingTop: 16,
  },
  // Summary row
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardAccent: {
    backgroundColor: '#1E5C2E', // bg-primary
    borderColor: '#1E5C2E',
  },
  statLabel: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.bold,
  },
  statLabelAccent: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.bold,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#18181B',
    marginTop: 6,
    fontFamily: FONTS.bold,
  },
  statValueAccent: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
    fontFamily: FONTS.bold,
  },
  statSub: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  statSubAccent: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },

  // Search input and filter btn row
  searchContainer: {
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#18181B',
    height: '100%',
    paddingVertical: 0,
    fontFamily: FONTS.regular,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },

  // Legend label list
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },

  // List Cards
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  idBadge: {
    backgroundColor: '#F4F4F5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  idText: {
    fontSize: 12,
    fontFamily: FONTS.mono,
    color: '#71717A',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: '#71717A',
    marginBottom: 2,
    fontFamily: FONTS.regular,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '750',
    color: '#18181B',
    fontFamily: FONTS.mono,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  alertText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '500',
    flex: 1,
    fontFamily: FONTS.regular,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnSecondary: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  btnPrimary: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E5C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
});
