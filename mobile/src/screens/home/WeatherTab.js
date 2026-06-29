import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import ErrorCard from '../../components/ErrorCard';
import WeatherForecast from '../../components/WeatherForecast';
import { getWeatherEmoji, getWeatherBorderColor, getWeatherGradient, getAgriAdvisory } from './helpers';
import commonStyles from './styles/commonStyles';
import weatherStyles from './styles/weatherStyles';
import { useWeatherDashboard } from '../../hooks/useWeatherDashboard';

export default function WeatherTab() {
  const { city, setCity, weatherLoading, weatherData, weatherError, handleFetchWeather } = useWeatherDashboard();

  return (
    <View style={commonStyles.tabContent}>
      <Text style={commonStyles.title}>Weather Information</Text>
      <Text style={commonStyles.subtitle}>Agrarian forecast & planning assistant</Text>

      <View style={weatherStyles.searchContainer}>
        <TextInput style={weatherStyles.searchInput} placeholder="Enter district/city (e.g. Agra)" placeholderTextColor={COLORS.textLight} value={city} onChangeText={setCity} autoCorrect={false} />
        <TouchableOpacity style={[weatherStyles.searchButton, weatherLoading && weatherStyles.fetchActionBtnDisabled]} onPress={() => handleFetchWeather()} disabled={weatherLoading} activeOpacity={0.85}>
          {weatherLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={weatherStyles.searchButtonText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {weatherError && <ErrorCard message={weatherError} onRetry={() => handleFetchWeather()} />}

      {weatherData && (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={[weatherStyles.weatherCardOuter, { borderColor: getWeatherBorderColor(weatherData.mainCondition) }]}>
            <LinearGradient colors={getWeatherGradient(weatherData.mainCondition)} style={weatherStyles.weatherCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
          <WeatherForecast forecast={weatherData.forecast} />
        </View>
      )}
    </View>
  );
}
