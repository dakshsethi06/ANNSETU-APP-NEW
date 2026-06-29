import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { getDayName, getWeatherEmoji, getWeatherBg, getWeatherBorderColor } from '../screens/home/helpers';
import weatherStyles from '../screens/home/styles/weatherStyles';

export default function WeatherForecast({ forecast }) {
  if (!forecast || forecast.length === 0) return null;
  return (
    <View style={weatherStyles.forecastContainer}>
      <Text style={weatherStyles.forecastTitle}>5-Day Weather Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={weatherStyles.forecastScroll}>
        {forecast.map((dayItem, idx) => (
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
  );
}
