import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../theme';

import MandiTab from './home/MandiTab';
import StorageTab from './home/StorageTab';
import ColdStorageTab from './home/ColdStorageTab';
import WeatherTab from './home/WeatherTab';
import HomeHeader from '../components/HomeHeader';
import layoutStyles from './home/styles/layoutStyles';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('prices');
  const isDarkStatus = activeTab === 'cold_storage' || activeTab === 'storage';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={layoutStyles.container}>
      <StatusBar barStyle={isDarkStatus ? 'dark-content' : 'light-content'} backgroundColor={isDarkStatus ? '#FFFFFF' : COLORS.greenDeep} />

      <HomeHeader isDarkStatus={isDarkStatus} />

      <View style={layoutStyles.tabOuterContainer}>
        <View style={layoutStyles.tabContainer}>
          {['prices', 'storage', 'cold_storage', 'weather'].map((tab) => {
            const label = tab === 'prices' ? 'Mandi' : tab === 'storage' ? 'Farmer' : tab === 'cold_storage' ? 'Storage' : 'Weather';
            return (
              <TouchableOpacity key={tab} style={[layoutStyles.tabButton, activeTab === tab && { backgroundColor: COLORS.greenDeep, borderRadius: 26 }]} onPress={() => setActiveTab(tab)} activeOpacity={0.9}>
                <Text style={[layoutStyles.tabText, activeTab === tab && layoutStyles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={layoutStyles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {activeTab === 'prices' && <MandiTab />}
        {activeTab === 'storage' && <StorageTab setActiveTab={setActiveTab} />}
        {activeTab === 'cold_storage' && <ColdStorageTab setActiveTab={setActiveTab} />}
        {activeTab === 'weather' && <WeatherTab />}
      </ScrollView>

      <View style={layoutStyles.footer}>
        <Text style={layoutStyles.footerText}>
          {activeTab === 'prices' ? 'Data directly from data.gov.in' : activeTab === 'storage' ? 'Data directly from PostgreSQL database' : activeTab === 'weather' ? 'Data directly from WeatherAPI.com' : 'Annsetu Agrarian Platform'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
