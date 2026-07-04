import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchMandiPrices } from '../services/mandiService';
import { COLORS, FONTS } from '../../../core/theme/theme';

export default function MandiPricePreview({ farmerState, onViewAll }) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrices();
  }, [farmerState]);

  const loadPrices = async () => {
    setLoading(true);
    try {
      const stateToQuery = farmerState || 'Uttar Pradesh';
      
      // Query all live records for this state
      const res = await fetchMandiPrices(stateToQuery, 'All');
      let fetchedRecords = res.records || [];

      // If no records for this state, query the general active live records across all states
      if (fetchedRecords.length === 0) {
        const fallbackRes = await fetchMandiPrices('All', 'All');
        fetchedRecords = fallbackRes.records || [];
      }

      // Map up to 3 live records to show on home preview card
      const mapped = fetchedRecords.slice(0, 3).map(rec => {
        const price = rec.modalPrice || rec.maxPrice || 0;
        const avg = (rec.minPrice + rec.maxPrice) / 2;
        const changeVal = Math.round(price - avg) || 0;
        return {
          commodity: rec.commodity,
          variety: rec.variety,
          market: rec.market,
          displayPrice: price,
          change: changeVal,
        };
      });

      setPrices(mapped);
    } catch (err) {
      console.warn('Failed to load mandi preview:', err.message);
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.wrapper}>
      {/* Header Row - outside card on beige background */}
      <View style={s.headerRow}>
        <Text style={s.title}>Live Mandi Prices / आज के भाव</Text>
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={s.viewAllBtn}>View All &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* White Content Card */}
      <View style={s.container}>
        {loading ? (
          <ActivityIndicator size="small" color="#1E5C2E" style={{ paddingVertical: 20 }} />
        ) : prices.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No active live mandi prices found.</Text>
          </View>
        ) : (
          <View style={s.rowsContainer}>
            {prices.map((item, idx) => {
              const isLast = idx === prices.length - 1;
              const isUp = item.change >= 0;
              return (
                <View 
                  key={idx} 
                  style={[
                    s.row, 
                    isLast ? s.rowLast : s.rowBorder
                  ]}
                >
                  <View style={s.rowLeft}>
                    <Text style={s.cropName}>
                      {item.commodity}{item.variety && item.variety !== '-' ? ` (${item.variety})` : ''}
                    </Text>
                    <Text style={s.marketLabel}>{item.market} Mandi</Text>
                  </View>
                  
                  <View style={s.rowRight}>
                    <Text style={s.priceText}>₹{item.displayPrice} / qtl</Text>
                    <Text style={[s.changeText, { color: isUp ? '#059669' : '#DC2626' }]}>
                      {isUp ? '+' : ''}{item.change}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginTop: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F4F4F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  viewAllBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  rowsContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  rowLast: {
    paddingBottom: 0,
  },
  rowLeft: {
    flex: 1,
  },
  cropName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  marketLabel: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.mono,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: FONTS.mono,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
});
