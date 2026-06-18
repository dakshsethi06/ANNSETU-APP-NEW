// =============================================
// HomeScreen — Annsetu App
// Tabs: Mandi Prices (with state selector) + Weather Info
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
    if (cond.includes('clear') || cond.includes('sunny')) return '#FFF3E0';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#E1F5FE';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#ECEFF1';
    return COLORS.white;
  };

  const getWeatherBorderColor = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return COLORS.amber;
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#4FC3F7';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#B0BEC5';
    return COLORS.greenLight;
  };

  // ── Render ────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.greenDeep} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandName}>Annsetu</Text>
      </View>

      {/* Navigation Tabs */}
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

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'prices' ? (
          /* ════════════ MANDI PRICES TAB ════════════ */
          <View style={styles.tabContent}>
            <Text style={styles.title}>Mandi Prices</Text>
            <Text style={styles.subtitle}>
              Potato — {selectedState || 'Select a state'}
            </Text>

            {/* Button Row: Select State + Find Prices */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.stateButton]}
                onPress={handleSelectState}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
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
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <Text style={styles.buttonText}>Fetching…</Text>
                    <ActivityIndicator size="small" color="#fff" />
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

            {minPrice !== null && maxPrice !== null && (
              <View style={styles.priceSection}>
                <View style={[styles.priceCard, styles.minCard]}>
                  <Text style={styles.priceLabel}>MINIMUM PRICE</Text>
                  <Text style={[styles.priceValue, { color: COLORS.greenMid }]}>
                    ₹{minPrice.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.priceUnit}>per quintal</Text>
                </View>
                <View style={[styles.priceCard, styles.maxCard]}>
                  <Text style={styles.priceLabel}>MAXIMUM PRICE</Text>
                  <Text style={[styles.priceValue, { color: COLORS.amber }]}>
                    ₹{maxPrice.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.priceUnit}>per quintal</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* ════════════ WEATHER TAB ════════════ */
          <View style={styles.tabContent}>
            <Text style={styles.title}>Weather Info</Text>
            <Text style={styles.subtitle}>Current & 5-Day Forecast</Text>

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
                activeOpacity={0.8}
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
              <View style={{ width: '100%' }}>
                {/* Current Weather Card */}
                <View
                  style={[
                    styles.weatherCard,
                    {
                      backgroundColor: getWeatherBg(weatherData.mainCondition),
                      borderTopColor: getWeatherBorderColor(weatherData.mainCondition),
                    },
                  ]}
                >
                  <Text style={styles.weatherLocation}>📍 {weatherData.location}</Text>
                  <View style={styles.tempRow}>
                    <Text style={styles.weatherEmoji}>
                      {getWeatherEmoji(weatherData.mainCondition)}
                    </Text>
                    <Text style={styles.weatherTemp}>{weatherData.temp}°C</Text>
                  </View>
                  <Text style={styles.weatherDesc}>{weatherData.description}</Text>

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
                    <Text style={styles.forecastTitle}>5-Day Forecast</Text>
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
          {activeTab === 'prices' ? 'Data from data.gov.in' : 'Data from WeatherAPI.com'}
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

  // Header
  header: {
    backgroundColor: COLORS.greenDeep,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.amberLight,
    letterSpacing: 0.5,
  },

  // Tab Bar
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.greenDeep,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#254E3D',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabButtonActive: {
    backgroundColor: '#2D6A4F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A9C3B7',
  },
  tabTextActive: {
    color: COLORS.white,
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.greenDeep,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 24,
  },

  // Mandi: button row
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 4,
  },
  button: {
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...SHADOWS.md,
  },
  stateButton: {
    backgroundColor: '#2D6A4F',
    flex: 1,
  },
  fetchButton: {
    backgroundColor: COLORS.greenDeep,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Error Box
  errorBox: {
    marginTop: 20,
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.errorRed,
    width: '100%',
  },
  errorText: {
    color: COLORS.textMid,
    fontSize: 14,
    textAlign: 'center',
  },

  // Price Cards
  priceSection: {
    marginTop: 24,
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  priceCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 4,
    ...SHADOWS.md,
  },
  minCard: {
    borderTopColor: COLORS.greenLight,
  },
  maxCard: {
    borderTopColor: COLORS.amber,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  priceUnit: {
    fontSize: 11,
    color: COLORS.textLight,
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
    borderColor: COLORS.wheatDark,
    ...SHADOWS.sm,
  },
  searchButton: {
    backgroundColor: COLORS.greenDeep,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...SHADOWS.sm,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Weather Card
  weatherCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: 24,
    borderTopWidth: 5,
    ...SHADOWS.md,
    marginBottom: 20,
  },
  weatherLocation: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  weatherEmoji: {
    fontSize: 48,
  },
  weatherTemp: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  weatherDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMid,
    textTransform: 'capitalize',
    marginBottom: 20,
  },
  weatherDetails: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    letterSpacing: 1,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  weatherDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },

  // 5-Day Forecast
  forecastContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 24,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  forecastScroll: {
    gap: 12,
    paddingRight: 10,
  },
  forecastCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    width: 105,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.wheatDark,
    ...SHADOWS.sm,
  },
  forecastDayName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  forecastEmoji: {
    fontSize: 28,
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
  },

  // Footer
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.wheatDark,
    backgroundColor: '#FAF5E8',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // ── Modal ──────────────────────────────────────
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
    fontWeight: '700',
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
    backgroundColor: 'rgba(45, 106, 79, 0.1)',
  },
  stateItemText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  stateItemTextSelected: {
    color: '#2D6A4F',
    fontWeight: '600',
  },
  checkMark: {
    fontSize: 18,
    color: '#2D6A4F',
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
