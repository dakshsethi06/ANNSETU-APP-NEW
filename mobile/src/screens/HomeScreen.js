// =============================================
// HomeScreen — Annsetu App
// Tabs: Mandi Prices (with state selector) + Weather Info
// Enhanced Premium Agrarian UI
// =============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { fetchMandiPrices, fetchStates, fetchWeather, fetchFarmers, addFarmer, fetchHoldings } from '../services/api';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

const getCommodityIcon = (name) => {
  switch (name) {
    case 'Potato': return '🥔';
    case 'Tomato': return '🍅';
    case 'Ladyfinger': return '🫛';
    default: return '🌾';
  }
};

const getCommodityTranslation = (name) => {
  switch (name) {
    case 'Potato': return 'Aloo';
    case 'Tomato': return 'Tamatar';
    case 'Ladyfinger': return 'Bhindi';
    default: return '';
  }
};

export default function HomeScreen() {
  // ── Tabs ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState('prices');

  // ── Mandi Prices state ────────────────────────
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [error, setError] = useState(null);

  // State, City, & Commodity selectors
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState('Potato');
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [commodityModalVisible, setCommodityModalVisible] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesList, setStatesList] = useState([]);
  const [stateSearch, setStateSearch] = useState('');
  const [citiesList, setCitiesList] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [allMandiRecords, setAllMandiRecords] = useState([]);

  // ── Weather state ─────────────────────────────
  const [city, setCity] = useState('Agra');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  // ── Storage Holdings & Farmer Lookup state ────
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [farmerData, setFarmerData] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [farmerError, setFarmerError] = useState(null);
  const [holdingsList, setHoldingsList] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState(null);

  // Load cities list automatically when state or commodity changes
  useEffect(() => {
    if (selectedState) {
      loadCitiesForState(selectedState, selectedCommodity);
    }
  }, [selectedState, selectedCommodity]);

  const loadCitiesForState = async (state, commodity) => {
    setCitiesLoading(true);
    try {
      const result = await fetchMandiPrices(state, commodity);
      const records = result.records || [];
      setAllMandiRecords(records);
      const uniqueCities = [...new Set(records.map(r => r.market))];
      setCitiesList(uniqueCities);
      if (uniqueCities.length > 0) {
        setSelectedCity(uniqueCities[0]);
      } else {
        setSelectedCity(null);
      }
    } catch (err) {
      console.warn("Failed to load cities:", err.message);
    } finally {
      setCitiesLoading(false);
    }
  };

  // Recalculate min/max prices reactively when selectedCity or allMandiRecords change
  useEffect(() => {
    if (allMandiRecords.length > 0) {
      const filtered = selectedCity 
        ? allMandiRecords.filter(r => r.market === selectedCity)
        : allMandiRecords;

      if (filtered.length > 0) {
        const overallMin = Math.min(...filtered.map((p) => p.minPrice).filter((v) => v > 0));
        const overallMax = Math.max(...filtered.map((p) => p.maxPrice).filter((v) => v > 0));
        setMinPrice(overallMin);
        setMaxPrice(overallMax);
      } else {
        setMinPrice(null);
        setMaxPrice(null);
      }
    } else {
      setMinPrice(null);
      setMaxPrice(null);
    }
  }, [selectedCity, allMandiRecords]);

  // Auto-fetch weather when entering weather tab for the first time
  useEffect(() => {
    if (activeTab === 'weather' && !weatherData && !weatherLoading) {
      handleFetchWeather('Agra');
    }
  }, [activeTab]);



  const handleSelectFarmer = async (id) => {
    setSelectedFarmerId(id);
    setFarmerLoading(true);
    setFarmerError(null);
    setHoldingsLoading(true);
    setHoldingsError(null);
    try {
      // Fetch specific farmer details
      const farmers = await fetchFarmers('', id);
      if (farmers && farmers.length > 0) {
        setFarmerData(farmers[0]);
      } else {
        setFarmerData(null);
        setFarmerError("Farmer details not found in registry.");
      }

      // Fetch holdings matching this ID
      const holdings = await fetchHoldings();
      const filtered = holdings.filter(h => h.id === id);
      setHoldingsList(filtered);
    } catch (err) {
      setFarmerError(err.message);
      setFarmerData(null);
      setHoldingsList([]);
    } finally {
      setFarmerLoading(false);
      setHoldingsLoading(false);
    }
  };

  // ── Mandi Prices handlers ─────────────────────
  const handleSelectState = async () => {
    setStateModalVisible(true);
    setStateSearch('');
    if (statesList.length === 0) {
      setStatesLoading(true);
      try {
        const states = await fetchStates();
        setStatesList(states);
      } catch (err) {
        setError(err.message);
        setStateModalVisible(false);
      } finally {
        setStatesLoading(false);
      }
    }
  };

  const handleStateSelect = (state) => {
    setSelectedState(state);
    setStateModalVisible(false);
    setSelectedCity(null);
    setCitiesList([]);
    setAllMandiRecords([]);
    setMinPrice(null);
    setMaxPrice(null);
    setError(null);
  };

  const handleFetch = async () => {
    if (!selectedState) {
      setError('Please select a state first.');
      return;
    }
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

  const filteredStates = statesList.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  // ── Weather handlers ──────────────────────────
  const handleFetchWeather = async (searchCity = city) => {
    if (!searchCity.trim()) {
      setWeatherError('Please enter a district or city name.');
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather(searchCity);
      setWeatherData(data);
    } catch (err) {
      setWeatherError(err.message);
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  // ── Weather helpers ───────────────────────────
  const getDayName = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  };

  const getWeatherEmoji = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '☁️';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy')) return '🌧️';
    if (cond.includes('thunder') || cond.includes('storm')) return '⛈️';
    if (cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard')) return '❄️';
    return '🌡️';
  };

  const getWeatherBg = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return '#FFFBEA';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#F0F9FF';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#F4F6F7';
    return COLORS.white;
  };

  const getWeatherBorderColor = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return COLORS.amber;
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#0EA5E9';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#94A3B8';
    return COLORS.greenLight;
  };

  // Farmer Agricultural Advisory Logic
  const getAgriAdvisory = (humidity, windSpeed, condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) {
      return "🌧️ Rain forecast: Suspend irrigation and secure harvested crops immediately.";
    }
    if (humidity > 80) {
      return "💧 High humidity: Increased risk of fungal pests. Keep a close watch on crops.";
    }
    if (windSpeed > 25) {
      return "💨 Strong winds: Postpone spraying chemical pesticides to avoid drift.";
    }
    return "✅ Good conditions: Ideal for weeding, fertilizer application, and spraying.";
  };

  // ── Render ────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.greenDeep} />

      {/* App Header */}
      <LinearGradient
        colors={['#14332A', '#1E4032', '#2D6A4F']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.brandName}>Annsetu</Text>
          <Text style={styles.brandTagline}>Connecting Farmers with Markets</Text>
          <View style={styles.headerAccent} />
        </View>
      </LinearGradient>

      {/* Centered Capsule Tabs Navigation */}
      <View style={styles.tabOuterContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'prices' && styles.tabButtonActive]}
            onPress={() => setActiveTab('prices')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'prices' && styles.tabTextActive]}>
              🌾 Prices
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'storage' && styles.tabButtonActive]}
            onPress={() => setActiveTab('storage')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'storage' && styles.tabTextActive]}>
              📦 Storage
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'weather' && styles.tabButtonActive]}
            onPress={() => setActiveTab('weather')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'weather' && styles.tabTextActive]}>
              ☀️ Weather
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'prices' ? (
          /* ════════════ MANDI PRICES TAB ════════════ */
          <View style={styles.tabContent}>
            <Text style={styles.title}>{selectedCommodity} Mandi Prices</Text>
            <Text style={styles.subtitle}>
              Live price ranges by state · per quintal
            </Text>

            {/* ─── Filter Selectors ─── */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>FILTERS</Text>

              {/* State Selector */}
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={handleSelectState}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownFieldInner}>
                  <Text style={styles.dropdownLabel}>State</Text>
                  <Text style={styles.dropdownValue} numberOfLines={1}>
                    {selectedState || 'Choose a state'}
                  </Text>
                </View>
                <Text style={styles.dropdownChevron}>›</Text>
              </TouchableOpacity>

              {/* City Selector */}
              <TouchableOpacity
                style={[styles.dropdownField, !selectedState && styles.dropdownFieldDisabled]}
                onPress={() => setCityModalVisible(true)}
                disabled={!selectedState || citiesLoading}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownFieldInner}>
                  <Text style={styles.dropdownLabel}>City / Market</Text>
                  {citiesLoading ? (
                    <ActivityIndicator size="small" color={COLORS.greenMid} style={{ alignSelf: 'flex-start' }} />
                  ) : (
                    <Text style={styles.dropdownValue} numberOfLines={1}>
                      {selectedCity || 'Select state first'}
                    </Text>
                  )}
                </View>
                <Text style={styles.dropdownChevron}>›</Text>
              </TouchableOpacity>

              {/* Commodity Selector */}
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => setCommodityModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownFieldInner}>
                  <Text style={styles.dropdownLabel}>Commodity</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>{getCommodityIcon(selectedCommodity)}</Text>
                    <Text style={styles.dropdownValue}>{selectedCommodity}</Text>
                  </View>
                </View>
                <Text style={styles.dropdownChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* ─── Fetch Action ─── */}
            <TouchableOpacity
              style={[
                styles.fetchActionBtn,
                (loading || !selectedState) && styles.fetchActionBtnDisabled,
              ]}
              onPress={handleFetch}
              disabled={loading || !selectedState}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.fetchActionBtnText}>Fetching…</Text>
                </View>
              ) : (
                <Text style={styles.fetchActionBtnText}>🔍  Fetch Market Prices</Text>
              )}
            </TouchableOpacity>

            {/* ─── Empty State ─── */}
            {!selectedState && !minPrice ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>🏢</Text>
                <Text style={styles.emptyStateTitle}>Choose your filters</Text>
                <Text style={styles.emptyStateText}>
                  Select a state, city, and commodity above to see the latest wholesale market prices.
                </Text>
              </View>
            ) : null}

            {/* ─── Price Dashboard ─── */}
            {minPrice !== null && maxPrice !== null && (
              <View style={styles.priceDashboard}>
                <View style={styles.dashboardAccentBar} />
                <View style={styles.dashboardBody}>
                  <View style={styles.dashboardHeader}>
                    <View style={styles.cropIconContainer}>
                      <Text style={styles.dashboardIcon}>{getCommodityIcon(selectedCommodity)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dashboardTitle}>{selectedCommodity} ({getCommodityTranslation(selectedCommodity)})</Text>
                      <Text style={styles.dashboardLocation}>📍 {selectedCity ? `${selectedCity}, ` : ''}{selectedState}</Text>
                    </View>
                  </View>

                  <View style={styles.dashboardDivider} />

                  <View style={styles.dashboardPriceRow}>
                    <View style={styles.priceCol}>
                      <Text style={styles.priceLabelText}>MIN PRICE</Text>
                      <Text style={[styles.priceValueText, { color: '#2D6A4F' }]}>
                        ₹{minPrice.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.priceUnit}>per quintal</Text>
                    </View>
                    <View style={styles.dashboardPriceDivider} />
                    <View style={styles.priceCol}>
                      <Text style={styles.priceLabelText}>MAX PRICE</Text>
                      <Text style={[styles.priceValueText, { color: '#C05621' }]}>
                        ₹{maxPrice.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.priceUnit}>per quintal</Text>
                    </View>
                  </View>

                  <View style={styles.dashboardFooter}>
                    <Text style={styles.spreadLabel}>SPREAD</Text>
                    <Text style={styles.spreadValue}>
                      ₹{(maxPrice - minPrice).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}
          </View>
        ) : activeTab === 'storage' ? (
          /* ════════════ COLD STORAGE TAB (FARMER LOOKUP) ════════════ */
          <View style={styles.tabContent}>
            <Text style={styles.title}>Farmer & Storage Lookup</Text>
            <Text style={styles.subtitle}>Choose a Farmer ID to load their profile and storage stock levels</Text>

            {/* ─── Farmer ID Selector ─── */}
            <View style={styles.idSelectorRow}>
              {['101', '102', '103', '104'].map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.idButton,
                    selectedFarmerId === id && styles.idButtonActive,
                  ]}
                  onPress={() => handleSelectFarmer(id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.idButtonText,
                      selectedFarmerId === id && styles.idButtonTextActive,
                    ]}
                  >
                    {id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Empty State */}
            {!selectedFarmerId && (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateTitle}>Select a Farmer ID</Text>
                <Text style={styles.emptyStateText}>
                  Click on any of the ID buttons above to view details for that farmer and their cold storage listings.
                </Text>
              </View>
            )}

            {/* Loading Indicator */}
            {selectedFarmerId && (farmerLoading || holdingsLoading) && (
              <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 36 }} />
            )}

            {/* Error Message */}
            {selectedFarmerId && !farmerLoading && !holdingsLoading && (farmerError || holdingsError) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {farmerError || holdingsError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => handleSelectFarmer(selectedFarmerId)}>
                  <Text style={styles.retryBtnText}>Retry Lookup</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Profile and Holdings Display */}
            {selectedFarmerId && !farmerLoading && !holdingsLoading && !farmerError && !holdingsError && (
              <View style={{ width: '100%' }}>
                {/* Farmer Profile Card */}
                {farmerData && (
                  <View style={styles.farmerCard}>
                    <View style={styles.farmerHeader}>
                      <View style={styles.farmerAvatar}>
                        <Text style={styles.farmerAvatarText}>👨‍🌾</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.farmerName}>{farmerData.name}</Text>
                        <Text style={styles.farmerSerial}>ID: {farmerData.serial_number}</Text>
                      </View>
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                      </View>
                    </View>
                    <View style={styles.farmerDivider} />
                    <View style={styles.farmerMetaRow}>
                      <Text style={styles.farmerMeta}>📍 State: {farmerData.state}</Text>
                      <Text style={styles.farmerMeta}>🌾 Crop: {farmerData.commodity}</Text>
                    </View>
                  </View>
                )}

                {/* Storage Holdings Header */}
                <Text style={[styles.filterSectionLabel, { marginTop: 12, marginBottom: 12 }]}>COLD STORAGE INVENTORY</Text>

                {/* Storage List */}
                {holdingsList.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateIcon}>📦</Text>
                    <Text style={styles.emptyStateTitle}>No Storage Holdings</Text>
                    <Text style={styles.emptyStateText}>No cold storage inventory is registered for this farmer.</Text>
                  </View>
                ) : (
                  holdingsList.map((h, idx) => {
                    const isFresh = h.status.toLowerCase() === 'fresh';
                    const badgeBg = isFresh ? '#E8F5E9' : '#E3F2FD';
                    const badgeText = isFresh ? '#2E7D32' : '#1565C0';
                    const badgeBorder = isFresh ? '#A5D6A7' : '#90CAF9';

                    return (
                      <View key={h.id + idx} style={styles.storageCard}>
                        <View style={styles.storageHeader}>
                          <View style={styles.storageIdBadge}>
                            <Text style={styles.storageIdText}>Storage ID: {h.id}</Text>
                          </View>
                          <View style={[styles.storageStatusBadge, { backgroundColor: badgeBg, borderColor: badgeBorder, borderWidth: 1 }]}>
                            <Text style={[styles.storageStatusText, { color: badgeText }]}>{h.status}</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.storageTitle}>{h.crop} — {h.variety}</Text>
                        <Text style={styles.storageFacility}>{h.cold_storage} · {h.location}</Text>
                        
                        <View style={styles.storageDivider} />
                        
                        <View style={styles.storageMetaGrid}>
                          <View style={styles.storageMetaCol}>
                            <Text style={styles.storageMetaLabel}>Bags</Text>
                            <Text style={styles.storageMetaValue}>{h.bags}</Text>
                          </View>
                          <View style={styles.storageMetaCol}>
                            <Text style={styles.storageMetaLabel}>Weight</Text>
                            <Text style={styles.storageMetaValue}>{h.weight}</Text>
                          </View>
                          <View style={styles.storageMetaCol}>
                            <Text style={styles.storageMetaLabel}>Age</Text>
                            <Text style={styles.storageMetaValue}>{h.age_days} days</Text>
                          </View>
                          <View style={styles.storageMetaCol}>
                            <Text style={styles.storageMetaLabel}>Inbound</Text>
                            <Text style={styles.storageMetaValue}>{h.inbound_age}</Text>
                          </View>
                        </View>

                        <TouchableOpacity style={styles.outlinedActionBtn} activeOpacity={0.75}>
                          <Text style={styles.outlinedActionBtnText}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        ) : (
          /* ════════════ WEATHER TAB ════════════ */
          <View style={styles.tabContent}>
            <Text style={styles.title}>Weather Information</Text>
            <Text style={styles.subtitle}>Agrarian forecast & planning assistant</Text>

            {/* Search Row */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter district/city (e.g. Agra)"
                placeholderTextColor={COLORS.textLight}
                value={city}
                onChangeText={setCity}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.searchButton, weatherLoading && styles.fetchActionBtnDisabled]}
                onPress={() => handleFetchWeather()}
                disabled={weatherLoading}
                activeOpacity={0.85}
              >
                {weatherLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>

            {weatherError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {weatherError}</Text>
              </View>
            )}

            {weatherData && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                {/* Current Weather Card */}
                <View
                  style={[
                    styles.weatherCard,
                    {
                      backgroundColor: getWeatherBg(weatherData.mainCondition),
                      borderColor: getWeatherBorderColor(weatherData.mainCondition),
                    },
                  ]}
                >
                  <View style={styles.weatherCardHeader}>
                    <Text style={styles.weatherLocation}>📍 {weatherData.location}</Text>
                    <View style={styles.weatherConditionBadge}>
                      <Text style={styles.weatherConditionBadgeText}>{weatherData.mainCondition}</Text>
                    </View>
                  </View>

                  <View style={styles.tempRow}>
                    <Text style={styles.weatherEmoji}>
                      {getWeatherEmoji(weatherData.mainCondition)}
                    </Text>
                    <Text style={styles.weatherTemp}>{weatherData.temp}°C</Text>
                  </View>
                  <Text style={styles.weatherDesc}>{weatherData.description}</Text>

                  {/* Agricultural Advice Banner */}
                  <View style={styles.advisoryBanner}>
                    <Text style={styles.advisoryTitle}>🌾 Farming Advisory</Text>
                    <Text style={styles.advisoryText}>
                      {getAgriAdvisory(weatherData.humidity, weatherData.windSpeed, weatherData.mainCondition)}
                    </Text>
                  </View>

                  <View style={styles.weatherDetails}>
                    <View style={styles.weatherDetailItem}>
                      <Text style={styles.weatherDetailLabel}>HUMIDITY</Text>
                      <Text style={styles.weatherDetailValue}>💧 {weatherData.humidity}%</Text>
                    </View>
                    <View style={styles.weatherDetailDivider} />
                    <View style={styles.weatherDetailItem}>
                      <Text style={styles.weatherDetailLabel}>WIND SPEED</Text>
                      <Text style={styles.weatherDetailValue}>💨 {weatherData.windSpeed} km/h</Text>
                    </View>
                  </View>
                </View>

                {/* 5-Day Forecast */}
                {weatherData.forecast && weatherData.forecast.length > 0 && (
                  <View style={styles.forecastContainer}>
                    <Text style={styles.forecastTitle}>5-Day Weather Forecast</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.forecastScroll}
                    >
                      {weatherData.forecast.map((dayItem, idx) => (
                        <View key={dayItem.date + idx} style={styles.forecastCard}>
                          <Text style={styles.forecastDayName}>{getDayName(dayItem.date)}</Text>
                          <Text style={styles.forecastEmoji}>
                            {getWeatherEmoji(dayItem.conditionText)}
                          </Text>
                          <Text style={styles.forecastTempMax}>{dayItem.maxTemp}°C</Text>
                          <Text style={styles.forecastTempMin}>{dayItem.minTemp}°C</Text>
                          <Text style={styles.forecastCondition} numberOfLines={1}>
                            {dayItem.conditionText}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {activeTab === 'prices' ? 'Data directly from data.gov.in' : activeTab === 'storage' ? 'Data from cold storage mock DB' : 'Data directly from WeatherAPI.com'}
        </Text>
      </View>



      {/* ════════════ STATE SELECTION MODAL ════════════ */}
      <Modal
        visible={stateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setStateModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Search */}
            <View style={styles.modalSearchContainer}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search states…"
                placeholderTextColor="#7A7A7A"
                value={stateSearch}
                onChangeText={setStateSearch}
                autoCorrect={false}
              />
            </View>

            {/* States List */}
            {statesLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.greenDeep} />
                <Text style={styles.loadingText}>Loading states…</Text>
              </View>
            ) : (
              <FlatList
                data={filteredStates}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No states found matching "{stateSearch}"
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.stateItem,
                      selectedState === item && styles.stateItemSelected,
                    ]}
                    onPress={() => handleStateSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.stateItemText,
                        selectedState === item && styles.stateItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {selectedState === item && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ════════════ COMMODITY SELECTION MODAL ════════════ */}
      <Modal
        visible={commodityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommodityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Commodity</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCommodityModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Commodities List */}
            <View style={{ paddingVertical: 8 }}>
              {[
                { name: 'Potato', icon: '🥔', translation: 'Aloo' },
                { name: 'Tomato', icon: '🍅', translation: 'Tamatar' },
                { name: 'Ladyfinger', icon: '🫛', translation: 'Bhindi' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.stateItem,
                    selectedCommodity === item.name && styles.stateItemSelected,
                    { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
                  ]}
                  onPress={() => {
                    setSelectedCommodity(item.name);
                    setCommodityModalVisible(false);
                    setMinPrice(null);
                    setMaxPrice(null);
                    setError(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                    <View>
                      <Text
                        style={[
                          styles.stateItemText,
                          selectedCommodity === item.name && styles.stateItemTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textLight, fontWeight: '500', marginTop: 2 }}>
                        {item.translation}
                      </Text>
                    </View>
                  </View>
                  {selectedCommodity === item.name && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════ CITY SELECTION MODAL ════════════ */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City / Market</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCityModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Cities List */}
            {citiesLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.greenDeep} />
                <Text style={styles.loadingText}>Loading markets…</Text>
              </View>
            ) : (
              <FlatList
                data={citiesList}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No markets found for this state.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.stateItem,
                      selectedCity === item && styles.stateItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedCity(item);
                      setCityModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.stateItemText,
                        selectedCity === item && styles.stateItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {selectedCity === item && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  scrollContainer: {
    flexGrow: 1,
  },

  // App Header
  header: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 64,
    paddingBottom: 26,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 13,
    color: '#A8D5BA',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  headerAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4882D',
    marginTop: 10,
    opacity: 0.8,
  },

  // Tab Bar
  tabOuterContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    width: '92%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 13,
  },
  tabButtonActive: {
    backgroundColor: COLORS.greenDeep,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // General Tab Content
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.greenDeep,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },

  // Mandi: Empty State Card
  emptyStateCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    marginBottom: 20,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textMid,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Unified Mandi Price Dashboard Card
  priceDashboard: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.md,
  },
  dashboardAccentBar: {
    height: 4,
    backgroundColor: COLORS.greenMid,
  },
  dashboardBody: {
    padding: 22,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cropIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0F7F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardIcon: {
    fontSize: 24,
  },
  dashboardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  dashboardLocation: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  dashboardDivider: {
    height: 1,
    backgroundColor: '#F0EBE0',
    marginVertical: 18,
  },
  dashboardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
  },
  dashboardPriceDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#F0EBE0',
  },
  priceLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  priceValueText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  dashboardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F5EE',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
  },
  spreadLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
  },
  spreadValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.greenDeep,
  },

  // Filter Section
  filterSection: {
    width: '100%',
    marginBottom: 8,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  dropdownFieldDisabled: {
    opacity: 0.45,
  },
  dropdownFieldInner: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dropdownChevron: {
    fontSize: 22,
    fontWeight: '300',
    color: '#C4B99A',
    marginLeft: 8,
  },

  // Fetch Action Button
  fetchActionBtn: {
    width: '100%',
    backgroundColor: COLORS.greenDeep,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...SHADOWS.md,
  },
  fetchActionBtnDisabled: {
    opacity: 0.35,
  },
  fetchActionBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Error Box
  errorBox: {
    marginTop: 10,
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.errorRed,
    width: '100%',
    marginBottom: 20,
  },
  errorText: {
    color: COLORS.errorRed,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Weather: Search Row
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: '#E8E0CE',
  },
  searchButton: {
    backgroundColor: COLORS.greenDeep,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Weather Card
  weatherCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: 22,
    borderWidth: 1.5,
    ...SHADOWS.md,
    marginBottom: 20,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weatherLocation: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  weatherConditionBadge: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weatherConditionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  weatherEmoji: {
    fontSize: 52,
  },
  weatherTemp: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  weatherDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMid,
    textTransform: 'capitalize',
    marginBottom: 16,
  },

  // Agricultural Weather Advisory Banner
  advisoryBanner: {
    backgroundColor: 'rgba(45, 106, 79, 0.08)',
    borderRadius: RADIUS.md,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.greenMid,
    marginBottom: 18,
  },
  advisoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: 4,
  },
  advisoryText: {
    fontSize: 12,
    color: COLORS.textMid,
    lineHeight: 16,
    fontWeight: '500',
  },

  weatherDetails: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: RADIUS.md,
    padding: 14,
  },
  weatherDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  weatherDetailDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  weatherDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  weatherDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },

  // 5-Day Forecast
  forecastContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 24,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDeep,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  forecastScroll: {
    gap: 12,
    paddingRight: 12,
  },
  forecastCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 14,
    width: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAD9B0',
    ...SHADOWS.sm,
  },
  forecastDayName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  forecastEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  forecastTempMax: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  forecastTempMin: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  forecastCondition: {
    fontSize: 10,
    color: COLORS.textMid,
    textTransform: 'capitalize',
    textAlign: 'center',
    width: '100%',
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EAD9B0',
    backgroundColor: '#FAF5E8',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.wheat,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAD9B0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.greenDeep,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAD9B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDeep,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EAD9B0',
  },
  modalSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: COLORS.textDark,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  stateItemSelected: {
    backgroundColor: 'rgba(45, 106, 79, 0.08)',
  },
  stateItemText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  stateItemTextSelected: {
    color: COLORS.greenDeep,
    fontWeight: '700',
  },
  checkMark: {
    fontSize: 18,
    color: COLORS.greenMid,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#EAD9B0',
    marginHorizontal: 24,
  },
  modalLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: COLORS.greenDeep,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  addFarmerCardTrigger: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderColor: COLORS.greenMid,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addFarmerTriggerText: {
    color: COLORS.greenDeep,
    fontWeight: '700',
    fontSize: 14,
  },
  farmerCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAD9B0',
    ...SHADOWS.md,
  },
  farmerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  farmerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#EAD9B0',
    borderWidth: 1,
  },
  farmerAvatarText: {
    fontSize: 20,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.greenDeep,
  },
  farmerSerial: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  verifiedBadgeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  farmerDivider: {
    height: 1,
    backgroundColor: '#F5ECE1',
    marginVertical: 12,
  },
  farmerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  farmerMeta: {
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDeep,
    marginBottom: 18,
  },
  submitButton: {
    backgroundColor: COLORS.greenDeep,
    borderRadius: 28,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.md,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  storageCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  storageIdBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  storageIdText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  storageStatusBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  storageStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  storageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  storageFacility: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 16,
  },
  storageDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  storageMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageMetaCol: {
    flex: 1,
  },
  storageMetaLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 6,
  },
  storageMetaValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  outlinedActionBtn: {
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignSelf: 'flex-start',
    marginTop: 18,
  },
  outlinedActionBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  idSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
    width: '100%',
  },
  idButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  idButtonActive: {
    backgroundColor: COLORS.greenDeep,
    borderColor: COLORS.greenDeep,
  },
  idButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  idButtonTextActive: {
    color: '#FFFFFF',
  },
});
