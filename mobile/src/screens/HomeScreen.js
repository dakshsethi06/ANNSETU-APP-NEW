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
import { fetchMandiPrices, fetchStates, fetchWeather } from '../services/api';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  // ── Tabs ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState('prices');

  // ── Mandi Prices state ────────────────────────
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [error, setError] = useState(null);

  // State selector
  const [selectedState, setSelectedState] = useState(null);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesList, setStatesList] = useState([]);
  const [stateSearch, setStateSearch] = useState('');

  // ── Weather state ─────────────────────────────
  const [city, setCity] = useState('Agra');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  // Auto-fetch weather when entering weather tab for the first time
  useEffect(() => {
    if (activeTab === 'weather' && !weatherData && !weatherLoading) {
      handleFetchWeather('Agra');
    }
  }, [activeTab]);

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
      const result = await fetchMandiPrices(selectedState);
      setMinPrice(result.minPrice);
      setMaxPrice(result.maxPrice);
    } catch (err) {
      setError(err.message);
      setMinPrice(null);
      setMaxPrice(null);
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

      {/* Premium Header with LinearGradient */}
      <LinearGradient
        colors={[COLORS.greenDeep, COLORS.greenMid]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.brandName}>Annsetu</Text>
          <Text style={styles.brandTagline}>🌾 Connecting Farmers with Markets</Text>
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
              🌾 Mandi Prices
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'weather' && styles.tabButtonActive]}
            onPress={() => setActiveTab('weather')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'weather' && styles.tabTextActive]}>
              ☀️ Weather Info
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
            <Text style={styles.title}>Potato Mandi Prices</Text>
            <Text style={styles.subtitle}>
              Live price ranges by state (per quintal)
            </Text>

            {/* Empty State / Select Prompt if state not selected */}
            {!selectedState ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>📍</Text>
                <Text style={styles.emptyStateTitle}>Select your State</Text>
                <Text style={styles.emptyStateText}>
                  Please choose an Indian state from the selector below to fetch the latest market price ranges for Potatoes.
                </Text>
              </View>
            ) : minPrice === null ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>🥔</Text>
                <Text style={styles.emptyStateTitle}>{selectedState}</Text>
                <Text style={styles.emptyStateText}>
                  State selected successfully. Click the "Find Prices" button to retrieve live data.
                </Text>
              </View>
            ) : null}

            {/* Unified Price Dashboard Widget */}
            {minPrice !== null && maxPrice !== null && (
              <View style={styles.priceDashboard}>
                <View style={styles.dashboardHeader}>
                  <View style={styles.cropIconContainer}>
                    <Text style={styles.dashboardIcon}>🥔</Text>
                  </View>
                  <View>
                    <Text style={styles.dashboardTitle}>Potato (Aloo)</Text>
                    <Text style={styles.dashboardLocation}>📍 {selectedState}</Text>
                  </View>
                </View>

                <View style={styles.dashboardDivider} />

                <View style={styles.dashboardPriceRow}>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabelText}>MIN PRICE</Text>
                    <Text style={[styles.priceValueText, { color: COLORS.greenMid }]}>
                      ₹{minPrice.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.dashboardPriceDivider} />
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabelText}>MAX PRICE</Text>
                    <Text style={[styles.priceValueText, { color: COLORS.amber }]}>
                      ₹{maxPrice.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                <View style={styles.dashboardFooter}>
                  <Text style={styles.spreadText}>
                    ⚖️ Market Price Spread: ₹{(maxPrice - minPrice).toLocaleString('en-IN')} / quintal
                  </Text>
                </View>
              </View>
            )}

            {/* Button Row: Select State + Find Prices */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.stateButton]}
                onPress={handleSelectState}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText} numberOfLines={1}>
                  {selectedState ? `📍 ${selectedState}` : '📍 Select State'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.fetchButton,
                  (loading || !selectedState) && styles.buttonDisabled,
                ]}
                onPress={handleFetch}
                disabled={loading || !selectedState}
                activeOpacity={0.85}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.buttonText}>Fetching…</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>🔍 Find Prices</Text>
                )}
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
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
                style={[styles.searchButton, weatherLoading && styles.buttonDisabled]}
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
          {activeTab === 'prices' ? 'Data directly from data.gov.in' : 'Data directly from WeatherAPI.com'}
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
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.wheat,
  },
  scrollContainer: {
    flexGrow: 1,
  },

  // Premium Header
  header: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 60,
    paddingBottom: 22,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.md,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  brandTagline: {
    fontSize: 12,
    color: COLORS.amberLight,
    marginTop: 4,
    fontWeight: '500',
  },

  // Modern Capsule Tab Bar
  tabOuterContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -20, // overlapping look
    zIndex: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 4,
    width: '90%',
    maxWidth: 360,
    ...SHADOWS.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 26,
  },
  tabButtonActive: {
    backgroundColor: COLORS.greenDeep,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.white,
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
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAD9B0',
    marginBottom: 20,
    ...SHADOWS.sm,
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
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 22,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#EAD9B0',
    ...SHADOWS.md,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cropIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAD9B0',
  },
  dashboardIcon: {
    fontSize: 22,
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDeep,
  },
  dashboardLocation: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  dashboardDivider: {
    height: 1,
    backgroundColor: '#EAD9B0',
    marginVertical: 16,
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
    height: 40,
    backgroundColor: '#EAD9B0',
  },
  priceLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  priceValueText: {
    fontSize: 24,
    fontWeight: '800',
  },
  dashboardFooter: {
    backgroundColor: COLORS.wheat,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginTop: 18,
    alignItems: 'center',
  },
  spreadText: {
    fontSize: 11,
    color: COLORS.greenDeep,
    fontWeight: '600',
  },

  // Mandi: Button Row
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 16,
  },
  button: {
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  stateButton: {
    backgroundColor: COLORS.greenMid,
    flex: 1.1,
  },
  fetchButton: {
    backgroundColor: COLORS.greenDeep,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.4,
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
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: '#EAD9B0',
    ...SHADOWS.sm,
  },
  searchButton: {
    backgroundColor: COLORS.greenDeep,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    ...SHADOWS.sm,
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
});
