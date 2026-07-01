import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, StatusBar, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWeather } from '../../services/weatherService';
import { FONTS } from '../../theme';

export default function WeatherTab({ farmerData = {}, onBackPress }) {
  const farmerCity = farmerData.village || farmerData.district || farmerData.state || 'Tundla';
  
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentCity, setCurrentCity] = useState(farmerCity);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  // Sync city state when changing active farmer profile
  useEffect(() => {
    setCurrentCity(farmerCity);
  }, [farmerCity]);

  useEffect(() => {
    loadWeatherData(currentCity);
  }, [currentCity]);

  const loadWeatherData = async (cityToQuery) => {
    setLoading(true);
    try {
      const data = await fetchWeather(cityToQuery);
      setWeatherData(data);
    } catch (err) {
      console.warn(`Failed to fetch weather for "${cityToQuery}":`, err.message);

      // 1. Fallback to district if different and available
      if (farmerData.district && cityToQuery !== farmerData.district) {
        try {
          console.log(`Attempting weather fallback to district: "${farmerData.district}"`);
          const data = await fetchWeather(farmerData.district);
          setWeatherData(data);
          return;
        } catch (e2) {
          console.warn(`Fallback to district "${farmerData.district}" failed:`, e2.message);
        }
      }

      // 2. Fallback to state if different and available
      if (farmerData.state && cityToQuery !== farmerData.state) {
        try {
          console.log(`Attempting weather fallback to state: "${farmerData.state}"`);
          const data = await fetchWeather(farmerData.state);
          setWeatherData(data);
          return;
        } catch (e3) {
          console.warn(`Fallback to state "${farmerData.state}" failed:`, e3.message);
        }
      }

      // 3. Fallback to 'Tundla' if everything else fails
      if (cityToQuery !== 'Tundla') {
        try {
          console.log('Attempting weather fallback to default: "Tundla"');
          const data = await fetchWeather('Tundla');
          setWeatherData(data);
          return;
        } catch (e4) {
          // ignore
        }
      }

      // Show alert if the user explicitly searched and it failed
      if (searchVisible) {
        Alert.alert('Search Failed', 'Could not fetch weather data for this location.');
      }

      // Final fallback to mock structures if still empty
      if (!weatherData) {
        setWeatherData({
          temp: 32,
          description: 'Clear Sky',
          mainCondition: 'Clear',
          humidity: 62,
          windSpeed: 12,
          location: `${cityToQuery}, Firozabad`,
          forecast: [
            { date: 'Today', maxTemp: 32, minTemp: 24, conditionText: 'Sunny', humidity: 5 },
            { date: 'Tomorrow', maxTemp: 30, minTemp: 22, conditionText: 'Cloudy', humidity: 20 },
            { date: 'Wed', maxTemp: 27, minTemp: 21, conditionText: 'Rainy', humidity: 70 },
            { date: 'Thu', maxTemp: 28, minTemp: 22, conditionText: 'Rainy', humidity: 55 },
            { date: 'Fri', maxTemp: 30, minTemp: 23, conditionText: 'Cloudy', humidity: 15 }
          ]
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Empty Input', 'Please enter a valid city or district name.');
      return;
    }
    setCurrentCity(searchQuery.trim());
    setSearchVisible(false);
  };

  const getConditionIcon = (condition = '') => {
    const cond = condition.toLowerCase();
    if (cond.includes('rain') || cond.includes('shower') || cond.includes('drizzle')) return 'cloud-rain';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist')) return 'cloud';
    if (cond.includes('thunder') || cond.includes('storm')) return 'cloud-lightning';
    return 'sun';
  };

  return (
    <View style={s.container}>
      {/* ─── Screen Header ─── */}
      <View style={s.topHeader}>
        <View style={s.topHeaderLeft}>
          <TouchableOpacity style={s.backBtn} onPress={onBackPress} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color="#1E5C2E" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Weather & Advisory</Text>
        </View>
        <TouchableOpacity 
          style={[s.searchBtn, searchVisible && s.searchBtnActive]} 
          onPress={() => setSearchVisible(!searchVisible)}
          activeOpacity={0.7}
        >
          <Feather name="search" size={18} color={searchVisible ? '#FFFFFF' : '#1E5C2E'} />
        </TouchableOpacity>
      </View>

      {/* ─── Search Overlay Input ─── */}
      {searchVisible && (
        <View style={s.searchContainer}>
          <View style={s.searchInputWrapper}>
            <Feather name="search" size={14} color="#A1A1AA" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search city or district (e.g. Agra, Ludhiana)"
              placeholderTextColor="#A1A1AA"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              autoFocus
            />
          </View>
          <TouchableOpacity style={s.searchActionBtn} onPress={handleSearchSubmit} activeOpacity={0.8}>
            <Text style={s.searchActionText}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {loading || !weatherData ? (
          <ActivityIndicator size="large" color="#1E5C2E" style={{ marginTop: 60 }} />
        ) : (
          <View>
            {/* ─── Weather Hero Card ─── */}
            <LinearGradient
              colors={['#38BDF8', '#2563EB']} // bg-gradient-to-br from-sky-400 to-blue-600
              style={s.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Decorative top-right circle overlay from App.tsx */}
              <View style={s.circleOverlay} />

              {/* Map pin location */}
              <View style={s.locationRow}>
                <Feather name="map-pin" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={s.locationText}>{weatherData.location}</Text>
              </View>

              {/* Temperature display */}
              <View style={s.tempContainer}>
                <Text style={s.tempValue}>{weatherData.temp}°C</Text>
                <Feather name={getConditionIcon(weatherData.description)} size={44} color="#F59E0B" style={s.sunIcon} />
              </View>

              <Text style={s.conditionText}>
                {weatherData.description} · Feels like {weatherData.temp + 3}°C
              </Text>

              {/* Weather Stats Row */}
              <View style={s.statsRow}>
                <View style={s.statCol}>
                  <Text style={s.statLabel}>Humidity</Text>
                  <Text style={s.statVal}>{weatherData.humidity}%</Text>
                </View>

                <View style={s.statCol}>
                  <Text style={s.statLabel}>Wind</Text>
                  <Text style={s.statVal}>{weatherData.windSpeed} km/h</Text>
                </View>

                <View style={s.statCol}>
                  <Text style={s.statLabel}>Rain</Text>
                  <Text style={s.statVal}>
                    {weatherData.forecast && weatherData.forecast[0] ? weatherData.forecast[0].humidity : 5}%
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* ─── 5-Day Forecast ─── */}
            <Text style={s.sectionTitle}>5-Day Forecast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.forecastScrollView}>
              {weatherData.forecast?.map((day, i) => {
                const isToday = i === 0;
                return (
                  <View key={i} style={[s.forecastCard, isToday && s.forecastCardActive]}>
                    <Text style={[s.forecastDay, isToday && s.forecastDayActive]}>
                      {isToday ? 'Today' : day.date}
                    </Text>
                    <Feather
                      name={getConditionIcon(day.conditionText)}
                      size={20}
                      color={isToday ? '#FFFFFF' : '#38BDF8'}
                      style={{ marginVertical: 8 }}
                    />
                    <Text style={[s.forecastTemp, isToday && s.forecastTempActive]}>
                      {day.maxTemp}°/{day.minTemp}°
                    </Text>
                    <Text style={[s.forecastRainText, isToday && { color: 'rgba(255,255,255,0.7)' }]}>
                      {day.humidity}%
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* ─── Crop Advisory List ─── */}
            <Text style={s.sectionTitle}>Crop Advisory</Text>

            {/* Advisory Item 1 */}
            <View style={[s.advisoryCard, s.advisoryCardGreen]}>
              <View style={s.advisoryHeader}>
                <Feather name="check-circle" size={16} color="#047857" style={{ marginRight: 8 }} />
                <Text style={[s.advisoryTitle, { color: '#047857' }]}>Good transport weather</Text>
              </View>
              <Text style={[s.advisorySubText, { color: '#065F46' }]}>
                Clear skies today and tomorrow. Ideal for dispatch and field transport operations.
              </Text>
            </View>

            {/* Advisory Item 2 */}
            <View style={[s.advisoryCard, s.advisoryCardOrange]}>
              <View style={s.advisoryHeader}>
                <Feather name="alert-triangle" size={16} color="#B45309" style={{ marginRight: 8 }} />
                <Text style={[s.advisoryTitle, { color: '#B45309' }]}>Rain expected Wednesday</Text>
              </View>
              <Text style={[s.advisorySubText, { color: '#92400E' }]}>
                Plan dispatch before Wednesday. Rainfall of 15-20mm expected. Avoid field operations.
              </Text>
            </View>

            {/* Advisory Item 3 */}
            <View style={[s.advisoryCard, s.advisoryCardBlue]}>
              <View style={s.advisoryHeader}>
                <Feather name="info" size={16} color="#1D4ED8" style={{ marginRight: 8 }} />
                <Text style={[s.advisoryTitle, { color: '#1D4ED8' }]}>Cold storage optimal</Text>
              </View>
              <Text style={[s.advisorySubText, { color: '#1E40AF' }]}>
                Ideal storage temperature inside facility rooms. Humidity is stable.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FAF7F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 92, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 92, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnActive: {
    backgroundColor: '#1E5C2E',
  },
  
  // Search Overlay Container Styles
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#18181B',
    paddingVertical: 0,
    fontFamily: FONTS.regular,
  },
  searchActionBtn: {
    backgroundColor: '#1E5C2E',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Hero Card styling matching App.tsx
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  circleOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    transform: [{ translateX: 24 }, { translateY: -24 }],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.9,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.regular,
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  tempValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  sunIcon: {
    marginRight: 8,
  },
  conditionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: FONTS.regular,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: FONTS.regular,
  },

  // Forecast Styles
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 12,
    fontFamily: FONTS.bold,
  },
  forecastScrollView: {
    gap: 8,
    marginBottom: 20,
  },
  forecastCard: {
    width: 76,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  forecastCardActive: {
    backgroundColor: '#1E5C2E', // Today card matching green color
    borderColor: '#1E5C2E',
  },
  forecastDay: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  forecastDayActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  forecastTemp: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.mono,
  },
  forecastTempActive: {
    color: '#FFFFFF',
  },
  forecastRainText: {
    fontSize: 10,
    color: '#2563EB',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },

  // Crop Advisory Cards
  advisoryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  advisoryCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  advisoryCardOrange: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  advisoryCardBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  advisoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  advisorySubText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONTS.regular,
  },
});
