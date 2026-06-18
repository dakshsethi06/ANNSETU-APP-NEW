// =============================================
// HomeScreen — Main screen of the Annsetu app
// Simple: Annsetu title, tabs for Prices & Weather
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
} from 'react-native';
import { fetchMandiPrices, fetchWeather } from '../services/api';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';

export default function HomeScreen() {
  // Tabs: 'prices' | 'weather'
  const [activeTab, setActiveTab] = useState('prices');

  // Mandi prices state
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [error, setError] = useState(null);

  // Weather state
  const [city, setCity] = useState('Agra');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  // Auto-fetch weather for default city when entering weather tab
  useEffect(() => {
    if (activeTab === 'weather' && !weatherData && !weatherLoading) {
      handleFetchWeather('Agra');
    }
  }, [activeTab]);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMandiPrices();
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

  const getDayName = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
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
    if (cond.includes('clear') || cond.includes('sunny')) return '#FFF3E0'; // Soft warm orange
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#E1F5FE'; // Soft sky blue
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#ECEFF1'; // Soft cloud grey
    return COLORS.white; // Default white
  };

  const getWeatherBorderColor = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return COLORS.amber;
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#4FC3F7';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#B0BEC5';
    return COLORS.greenLight;
  };

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

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {activeTab === 'prices' ? (
          /* MANDI PRICES TAB */
          <View style={styles.tabContent}>
            <Text style={styles.title}>Mandi Prices</Text>
            <Text style={styles.subtitle}>Potato — Uttar Pradesh</Text>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleFetch}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.buttonRow}>
                  <Text style={styles.buttonText}>Fetching…</Text>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <Text style={styles.buttonText}>Find Mandi Prices</Text>
              )}
            </TouchableOpacity>

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
          /* WEATHER INFORMATION TAB */
          <View style={styles.tabContent}>
            <Text style={styles.title}>Local Weather</Text>
            <Text style={styles.subtitle}>Real-time Agricultural Conditions</Text>

            {/* Weather Search input */}
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

            {/* Weather Info Details Card */}
            {weatherData && (
              <View style={{ width: '100%' }}>
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

                {/* 5-Day Forecast Grid */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.wheat,
  },
  scrollContainer: {
    flexGrow: 1,
  },
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
  // Tab Bar styling
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
  // Main Content
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
  // Mandi Button
  button: {
    backgroundColor: COLORS.greenDeep,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    paddingHorizontal: 40,
    ...SHADOWS.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
  // Mandi Price Cards
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
  // Weather Search Container
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
  // Weather Info Card
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: RADIUS.md,
    padding: 14,
  },
  weatherDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  weatherDetailDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
  // Forecast styles
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
});
