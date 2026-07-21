import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Platform, StatusBar, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../../../core/theme/theme';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import s from '../styles/stockTabStyles';
import { useTranslation } from 'react-i18next';
import TranslatedText from '../../../core/components/TranslatedText';

export default function StockTab({ holdingsList = [], manualStockMt, manualBags, onUpdateStockPress, disableFallback = false }) {
  const { t } = useTranslation();
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
    fresh: { key: "fresh", label: "Fresh", color: "#047857", bg: "#ECFDF5", dot: "#10B981" },
    good: { key: "good", label: "Good", color: "#1D4ED8", bg: "#EFF6FF", dot: "#3B82F6" },
    warning: { key: "warning", label: "Warning", color: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" },
    danger: { key: "danger", label: "Critical", color: "#B91C1C", bg: "#FEF2F2", dot: "#EF4444" },
  };

  const renderStockCard = ({ item }) => {
    const cfg = statusConfig[item.status] || statusConfig.fresh;
    const isWarning = item.status === 'warning';
    
    const translatedStatusLabel = t(`dashboard.${cfg.key === 'danger' ? 'critical' : cfg.key}`);

    return (
      <View style={s.card}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <View style={s.idBadge}>
            <Text style={s.idText}>{item.id}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.statusBadgeText, { color: cfg.color }]}>{translatedStatusLabel}</Text>
          </View>
        </View>

        {/* Title */}
        <TranslatedText style={s.cardTitle}>{item.commodity} — {item.variety}</TranslatedText>
        <TranslatedText style={s.cardSubtitle}>{item.storage} · {item.room}</TranslatedText>

        {/* Stats Grid - 4 Columns matching Mockup */}
        <View style={s.gridRow}>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>{t('dashboard.bags')}</Text>
            <Text style={s.gridValue}>{item.bags}</Text>
          </View>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>{t('dashboard.weight')}</Text>
            <Text style={s.gridValue}>{item.weight}</Text>
          </View>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>{t('dashboard.age')}</Text>
            <Text style={s.gridValue}>{item.age} {t('khata.days_unit_other')}</Text>
          </View>
          <View style={s.gridCol}>
            <Text style={s.gridLabel}>{t('dashboard.age')}</Text>
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
              {t('stock.stock_nearing_alert')}
            </Text>
          </View>
        )}

        {/* Buttons */}
        <View style={s.buttonsRow}>
          <TouchableOpacity
            style={s.btnSecondary}
            onPress={() => Alert.alert(t('stock.view_details'), `Lot ${item.id}\nCrop: ${item.commodity}\nVariety: ${item.variety}\nStored at: ${item.storage}`)}
            activeOpacity={0.7}
          >
            <Text style={s.btnSecondaryText}>{t('stock.view_details')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => Alert.alert(t('stock.request_dispatch'), `Dispatch requested for lot ${item.id}`)}
            activeOpacity={0.8}
          >
            <Text style={s.btnPrimaryText}>{t('stock.request_dispatch')}</Text>
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
                <Text style={s.statLabel}>{t('dashboard.total_stock')}</Text>
                <Text style={s.statValue}>{totalWeightMt.toFixed(1)} MT</Text>
                <Text style={s.statSub}>{totalBags} {t('dashboard.bags')}</Text>
              </TouchableOpacity>

              <View style={[s.statCard, s.statCardAccent]}>
                <Text style={s.statLabelAccent}>{t('dashboard.aging_alerts')}</Text>
                <Text style={s.statValueAccent}>{agingAlertsCount}</Text>
                <Text style={s.statSubAccent}>{agingAlertsCount >= 1 ? t('stock.need_attention') : t('dashboard.all_good')}</Text>
              </View>
            </View>

            {/* ── Search and Filter ── */}
            <View style={s.searchContainer}>
              <View style={s.searchBar}>
                <Feather name="search" size={16} color="#71717A" style={{ marginRight: 8 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder={t('stock.search_placeholder')}
                  placeholderTextColor="#A1A1AA"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  style={s.filterBtn}
                  onPress={() => Alert.alert(t('stock.filter'), 'Show filter controls')}
                  activeOpacity={0.7}
                >
                  <Feather name="filter" size={12} color="#1E5C2E" style={{ marginRight: 4 }} />
                  <Text style={s.filterText}>{t('stock.filter')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Legend Dot Labels ── */}
            <View style={s.legendRow}>
              {Object.entries(statusConfig).map(([k, v]) => (
                <View key={k} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: v.dot }]} />
                  <Text style={s.legendText}>{t(`dashboard.${v.key === 'danger' ? 'critical' : v.key}`)}</Text>
                </View>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="package" size={40} color="#A1A1AA" />
            <Text style={s.emptyText}>
              {stockData.length === 0 ? t('stock.no_stock_available') : t('stock.no_matching_records')}
            </Text>
          </View>
        }
      />
    </View>
  );
}
