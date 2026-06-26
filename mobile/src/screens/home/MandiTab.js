import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchMandiPrices } from '../../services/api';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import PriceCard from '../../components/PriceCard';
import ErrorCard from '../../components/ErrorCard';
import { getCommodityIcon, getCommodityTranslation, calculatePrices } from './helpers';
import StateModal from './modals/StateModal';
import CityModal from './modals/CityModal';
import CommodityModal from './modals/CommodityModal';
import commonStyles from './styles/commonStyles';
import mandiStyles from './styles/mandiStyles';

export default function MandiTab() {
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [error, setError] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState('Potato');
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [commodityModalVisible, setCommodityModalVisible] = useState(false);
  const [citiesList, setCitiesList] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [allMandiRecords, setAllMandiRecords] = useState([]);

  useEffect(() => {
    if (selectedState) loadCitiesForState(selectedState, selectedCommodity);
  }, [selectedState, selectedCommodity]);

  const loadCitiesForState = async (state, commodity) => {
    setCitiesLoading(true);
    try {
      const result = await fetchMandiPrices(state, commodity);
      const records = result.records || [];
      setAllMandiRecords(records);
      const uniqueCities = [...new Set(records.map((r) => r.market))];
      setCitiesList(uniqueCities);
      setSelectedCity(uniqueCities.length > 0 ? uniqueCities[0] : null);
    } catch (err) {
      console.warn('Failed to load cities:', err.message);
    } finally {
      setCitiesLoading(false);
    }
  };

  useEffect(() => {
    const { minPrice: computedMin, maxPrice: computedMax } = calculatePrices(allMandiRecords, selectedCity);
    setMinPrice(computedMin);
    setMaxPrice(computedMax);
  }, [selectedCity, allMandiRecords]);

  const handleFetch = async () => {
    if (!selectedState) return setError('Please select a state first.');
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMandiPrices(selectedState, selectedCommodity);
      setAllMandiRecords(result.records || []);
    } catch (err) {
      setError(err.message);
      setAllMandiRecords([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={commonStyles.tabContent}>
      <Text style={commonStyles.title}>{selectedCommodity} Mandi Prices</Text>
      <Text style={commonStyles.subtitle}>Live price ranges by state · per quintal</Text>

      <View style={mandiStyles.filterSection}>
        <Text style={mandiStyles.filterSectionLabel}>FILTERS</Text>
        <TouchableOpacity style={mandiStyles.dropdownField} onPress={() => setStateModalVisible(true)} activeOpacity={0.7}>
          <View style={mandiStyles.dropdownIconBadge}><Text style={{ fontSize: 16 }}>🗺️</Text></View>
          <View style={mandiStyles.dropdownFieldInner}>
            <Text style={mandiStyles.dropdownLabel}>State</Text>
            <Text style={mandiStyles.dropdownValue} numberOfLines={1}>{selectedState || 'Choose a state'}</Text>
          </View>
          <Text style={mandiStyles.dropdownChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[mandiStyles.dropdownField, !selectedState && mandiStyles.dropdownFieldDisabled]}
          onPress={() => setCityModalVisible(true)}
          disabled={!selectedState || citiesLoading}
          activeOpacity={0.7}
        >
          <View style={mandiStyles.dropdownIconBadge}><Text style={{ fontSize: 16 }}>📍</Text></View>
          <View style={mandiStyles.dropdownFieldInner}>
            <Text style={mandiStyles.dropdownLabel}>City / Market</Text>
            {citiesLoading ? (
              <ActivityIndicator size="small" color={COLORS.greenMid} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Text style={mandiStyles.dropdownValue} numberOfLines={1}>{selectedCity || 'Select state first'}</Text>
            )}
          </View>
          <Text style={mandiStyles.dropdownChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={mandiStyles.dropdownField} onPress={() => setCommodityModalVisible(true)} activeOpacity={0.7}>
          <View style={mandiStyles.dropdownIconBadge}><Text style={{ fontSize: 16 }}>{getCommodityIcon(selectedCommodity)}</Text></View>
          <View style={mandiStyles.dropdownFieldInner}>
            <Text style={mandiStyles.dropdownLabel}>Commodity</Text>
            <Text style={mandiStyles.dropdownValue}>{selectedCommodity}</Text>
          </View>
          <Text style={mandiStyles.dropdownChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[mandiStyles.fetchActionBtn, (loading || !selectedState) && mandiStyles.fetchActionBtnDisabled]}
        onPress={handleFetch}
        disabled={loading || !selectedState}
        activeOpacity={0.85}
      >
        {!loading && selectedState && (
          <LinearGradient
            colors={[COLORS.greenDeep, COLORS.greenMid]}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        {loading ? (
          <View style={mandiStyles.loadingRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={mandiStyles.fetchActionBtnText}>Fetching…</Text>
          </View>
        ) : (
          <Text style={mandiStyles.fetchActionBtnText}>🔍  Fetch Market Prices</Text>
        )}
      </TouchableOpacity>

      {!selectedState && !minPrice ? (
        <View style={commonStyles.emptyStateCard}>
          <Text style={commonStyles.emptyStateIcon}>🏢</Text>
          <Text style={commonStyles.emptyStateTitle}>Choose your filters</Text>
          <Text style={commonStyles.emptyStateText}>Select a state, city, and commodity above to see wholesale market prices.</Text>
        </View>
      ) : null}

      {minPrice !== null && maxPrice !== null && (
        <View style={mandiStyles.priceDashboard}>
          <View style={mandiStyles.dashboardAccentBar} />
          <View style={mandiStyles.dashboardBody}>
            <View style={mandiStyles.dashboardHeader}>
              <View style={mandiStyles.cropIconContainer}><Text style={mandiStyles.dashboardIcon}>{getCommodityIcon(selectedCommodity)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={mandiStyles.dashboardTitle}>{selectedCommodity} ({getCommodityTranslation(selectedCommodity)})</Text>
                <Text style={mandiStyles.dashboardLocation}>📍 {selectedCity ? `${selectedCity}, ` : ''}{selectedState}</Text>
              </View>
            </View>
            <View style={mandiStyles.dashboardDivider} />
            <View style={mandiStyles.priceCardsRow}>
              <PriceCard label="Min Price" value={minPrice} variant="min" />
              <PriceCard label="Max Price" value={maxPrice} variant="max" />
            </View>
            <View style={mandiStyles.spreadGaugeContainer}>
              <View style={mandiStyles.spreadGaugeLabels}>
                <Text style={mandiStyles.spreadGaugeMin}>₹{minPrice.toLocaleString('en-IN')}</Text>
                <Text style={mandiStyles.spreadGaugeSpread}>Spread: ₹{(maxPrice - minPrice).toLocaleString('en-IN')}</Text>
                <Text style={mandiStyles.spreadGaugeMax}>₹{maxPrice.toLocaleString('en-IN')}</Text>
              </View>
              <View style={mandiStyles.spreadGaugeTrack}>
                <LinearGradient
                  colors={[COLORS.greenLight, COLORS.amber, COLORS.errorRed]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {error && <ErrorCard message={error} onRetry={handleFetch} />}

      <StateModal visible={stateModalVisible} onClose={() => setStateModalVisible(false)} selectedState={selectedState} onSelectState={setSelectedState} />
      <CityModal visible={cityModalVisible} onClose={() => setCityModalVisible(false)} selectedCity={selectedCity} onSelectCity={setSelectedCity} citiesList={citiesList} citiesLoading={citiesLoading} />
      <CommodityModal visible={commodityModalVisible} onClose={() => setCommodityModalVisible(false)} selectedCommodity={selectedCommodity} onSelectCommodity={setSelectedCommodity} />
    </View>
  );
}
