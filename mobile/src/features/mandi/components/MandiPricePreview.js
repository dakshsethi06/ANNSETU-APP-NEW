import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fetchMandiPrices } from '../services/mandiService';
import { COLORS, FONTS } from '../../../core/theme/theme';
import TranslatedText from '../../../core/components/TranslatedText';

import s from '../styles/mandiPricePreviewStyles';

export default function MandiPricePreview({ farmerState, onViewAll }) {
  const { t } = useTranslation();
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
        <Text style={s.title}>{t('mandi.live_mandi_prices')}</Text>
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={s.viewAllBtn}>{t('dashboard.view_all_link')}</Text>
        </TouchableOpacity>
      </View>

      {/* White Content Card */}
      <View style={s.container}>
        {loading ? (
          <ActivityIndicator size="small" color="#1E5C2E" style={{ paddingVertical: 20 }} />
        ) : prices.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>{t('mandi.no_price_records')} "All"</Text>
          </View>
        ) : (
          <View style={s.rowsContainer}>
            {prices.map((item, idx) => {
              const isLast = idx === prices.length - 1;
              const isUp = item.change >= 0;
              const commodityVarietyText = `${item.commodity}${item.variety && item.variety !== '-' ? ` (${item.variety})` : ''}`;
              
              return (
                <View 
                  key={idx} 
                  style={[
                    s.row, 
                    isLast ? s.rowLast : s.rowBorder
                  ]}
                >
                  <View style={s.rowLeft}>
                    <TranslatedText style={s.cropName}>
                      {commodityVarietyText}
                    </TranslatedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TranslatedText style={s.marketLabel}>{item.market}</TranslatedText>
                      <Text style={s.marketLabel}> {t('mandi.mandi_suffix')}</Text>
                    </View>
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
