import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { fetchWeather } from '../../services/api';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import ErrorCard from '../../components/ErrorCard';
import {
  getDayName,
  getWeatherEmoji,
  getWeatherBg,
  getWeatherBorderColor,
  getWeatherGradient,
  getAgriAdvisory,
} from './helpers';
import commonStyles from './styles/commonStyles';
import weatherStyles from './styles/weatherStyles';

export default function WeatherTab() {
  const [city, setCity] = useState('Agra');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    handleFetchWeather();
  }, []);

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

  return (
    <View style={commonStyles.tabContent}>
      <Text style={commonStyles.title}>Weather Information</Text>
      <Text style={commonStyles.subtitle}>Agrarian forecast & planning assistant</Text>

      {/* Search Row */}
      <View style={weatherStyles.searchContainer}>
        <TextInput
          style={weatherStyles.searchInput}
          placeholder="Enter district/city (e.g. Agra)"
          placeholderTextColor={COLORS.textLight}
          value={city}
          onChangeText={setCity}
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[weatherStyles.searchButton, weatherLoading && weatherStyles.fetchActionBtnDisabled]}
          onPress={() => handleFetchWeather()}
          disabled={weatherLoading}
          activeOpacity={0.85}
        >
          {weatherLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={weatherStyles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {weatherError && <ErrorCard message={weatherError} onRetry={() => handleFetchWeather()} />}

      {weatherData && (
        <View style={{ width: '100%', alignItems: 'center' }}>
          {/* Current Weather Card */}
          <View style={[weatherStyles.weatherCardOuter, { borderColor: getWeatherBorderColor(weatherData.mainCondition) }]}>
            <LinearGradient
              colors={getWeatherGradient(weatherData.mainCondition)}
              style={weatherStyles.weatherCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={weatherStyles.weatherCardHeader}>
                <Text style={weatherStyles.weatherLocation}>📍 {weatherData.location}</Text>
                <View style={weatherStyles.weatherConditionBadge}>
                  <Text style={weatherStyles.weatherConditionBadgeText}>{weatherData.mainCondition}</Text>
                </View>
              </View>

              <View style={weatherStyles.tempRow}>
                <Text style={weatherStyles.weatherEmoji}>{getWeatherEmoji(weatherData.mainCondition)}</Text>
                <Text style={weatherStyles.weatherTemp}>{weatherData.temp}°C</Text>
              </View>
              <Text style={weatherStyles.weatherDesc}>{weatherData.description}</Text>

              {/* Advisory Sub-banner */}
              <View style={weatherStyles.advisoryBanner}>
                <Text style={weatherStyles.advisoryTitle}>🌾 AGRARIAN ADVISORY</Text>
                <Text style={weatherStyles.advisoryText}>
                  {getAgriAdvisory(weatherData.humidity, weatherData.windSpeed, weatherData.mainCondition)}
                </Text>
              </View>

              <View style={weatherStyles.weatherDetails}>
                <View style={weatherStyles.weatherDetailItem}>
                  <Text style={weatherStyles.weatherDetailLabel}>HUMIDITY</Text>
                  <Text style={weatherStyles.weatherDetailValue}>💧 {weatherData.humidity}%</Text>
                </View>
                <View style={weatherStyles.weatherDetailDivider} />
                <View style={weatherStyles.weatherDetailItem}>
                  <Text style={weatherStyles.weatherDetailLabel}>WIND SPEED</Text>
                  <Text style={weatherStyles.weatherDetailValue}>💨 {weatherData.windSpeed} km/h</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* 5-Day Forecast */}
          {weatherData.forecast && weatherData.forecast.length > 0 && (
            <View style={weatherStyles.forecastContainer}>
              <Text style={weatherStyles.forecastTitle}>5-Day Weather Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={weatherStyles.forecastScroll}>
                {weatherData.forecast.map((dayItem, idx) => (
                  <View
                    key={dayItem.date + idx}
                    style={[
                      weatherStyles.forecastCard,
                      {
                        backgroundColor: getWeatherBg(dayItem.conditionText),
                        borderColor: getWeatherBorderColor(dayItem.conditionText),
                      },
                    ]}
                  >
                    <Text style={weatherStyles.forecastDayName}>{getDayName(dayItem.date)}</Text>
                    <Text style={weatherStyles.forecastEmoji}>{getWeatherEmoji(dayItem.conditionText)}</Text>
                    <Text style={weatherStyles.forecastTempMax}>{dayItem.maxTemp}°C</Text>
                    <Text style={weatherStyles.forecastTempMin}>{dayItem.minTemp}°C</Text>
                    <Text style={weatherStyles.forecastCondition} numberOfLines={1}>
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
  );
}
