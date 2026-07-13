import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, StatusBar, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWeather } from '../services/weatherService';
import s from '../styles/weatherStyles';
import { FONTS } from '../../../core/theme/theme';
import { useTranslation } from 'react-i18next';
import TranslatedText from '../../../core/components/TranslatedText';

export default function WeatherTab({ farmerData = {}, onBackPress }) {
  const { t } = useTranslation();
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
          <Text style={s.headerTitle}>{t('weather.weather_and_advisory')}</Text>
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
              placeholder={t('weather.search_placeholder')}
              placeholderTextColor="#A1A1AA"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              autoFocus
            />
          </View>
          <TouchableOpacity style={s.searchActionBtn} onPress={handleSearchSubmit} activeOpacity={0.8}>
            <Text style={s.searchActionText}>{t('mandi.search')}</Text>
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
                <TranslatedText style={s.locationText}>{weatherData.location}</TranslatedText>
              </View>

              {/* Temperature display */}
              <View style={s.tempContainer}>
                <Text style={s.tempValue}>{weatherData.temp}°C</Text>
                <Feather name={getConditionIcon(weatherData.description)} size={44} color="#F59E0B" style={s.sunIcon} />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <TranslatedText style={s.conditionText}>{weatherData.description}</TranslatedText>
                <Text style={s.conditionText}> · {t('weather.feels_like')} {weatherData.temp + 3}°C</Text>
              </View>

              {/* Weather Stats Row */}
              <View style={s.statsRow}>
                <View style={s.statCol}>
                  <Text style={s.statLabel}>{t('weather.humidity')}</Text>
                  <Text style={s.statVal}>{weatherData.humidity}%</Text>
                </View>

                <View style={s.statCol}>
                  <Text style={s.statLabel}>{t('weather.wind')}</Text>
                  <Text style={s.statVal}>{weatherData.windSpeed} km/h</Text>
                </View>

                <View style={s.statCol}>
                  <Text style={s.statLabel}>{t('weather.rain')}</Text>
                  <Text style={s.statVal}>
                    {weatherData.forecast && weatherData.forecast[0] ? weatherData.forecast[0].humidity : 5}%
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* ─── 5-Day Forecast ─── */}
            <Text style={s.sectionTitle}>{t('weather.five_day_forecast')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.forecastScrollView}>
              {weatherData.forecast?.map((day, i) => {
                const isToday = i === 0;
                return (
                  <View key={i} style={[s.forecastCard, isToday && s.forecastCardActive]}>
                    <Text style={[s.forecastDay, isToday && s.forecastDayActive]}>
                      {isToday ? t('weather.today') : day.date}
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
            <Text style={s.sectionTitle}>{t('weather.crop_advisory')}</Text>

            {/* Advisory Item 1 */}
            <View style={[s.advisoryCard, s.advisoryCardGreen]}>
              <View style={s.advisoryHeader}>
                <Feather name="check-circle" size={16} color="#047857" style={{ marginRight: 8 }} />
                <Text style={[s.advisoryTitle, { color: '#047857' }]}>{t('weather.advisory1_title')}</Text>
              </View>
              <Text style={[s.advisorySubText, { color: '#065F46' }]}>
                {t('weather.advisory1_text')}
              </Text>
            </View>

            {/* Advisory Item 2 */}
            <View style={[s.advisoryCard, s.advisoryCardOrange]}>
              <View style={s.advisoryHeader}>
                <Feather name="alert-triangle" size={16} color="#B45309" style={{ marginRight: 8 }} />
                <Text style={[s.advisoryTitle, { color: '#B45309' }]}>{t('weather.advisory2_title')}</Text>
              </View>
              <Text style={[s.advisorySubText, { color: '#92400E' }]}>
                {t('weather.advisory2_text')}
              </Text>
            </View>

            {/* Advisory Item 3 */}
            <View style={[s.advisoryCard, s.advisoryCardBlue]}>
              <View style={s.advisoryHeader}>
                <Feather name="info" size={16} color="#1D4ED8" style={{ marginRight: 8 }} />
                <Text style={[s.advisoryTitle, { color: '#1D4ED8' }]}>{t('weather.advisory3_title')}</Text>
              </View>
              <Text style={[s.advisorySubText, { color: '#1E40AF' }]}>
                {t('weather.advisory3_text')}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
