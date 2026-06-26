// =============================================
// HomeScreen — Annsetu App
// Tabs: Mandi Prices + Farmer Lookup + Cold Storage + Weather
// Enhanced Premium Agrarian UI
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

// Service tab components
import MandiTab from './home/MandiTab';
import StorageTab from './home/StorageTab';
import ColdStorageTab from './home/ColdStorageTab';
import WeatherTab from './home/WeatherTab';

// Styles
import layoutStyles from './home/styles/layoutStyles';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('prices');

  // Decide status bar styling based on active tab background
  const isDarkStatus = activeTab === 'cold_storage' || activeTab === 'storage';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={layoutStyles.container}
    >
      <StatusBar
        barStyle={isDarkStatus ? 'dark-content' : 'light-content'}
        backgroundColor={isDarkStatus ? '#FFFFFF' : COLORS.greenDeep}
      />

      {/* Premium Agrarian Header */}
      {!isDarkStatus && (
        <View style={{ backgroundColor: COLORS.greenDeep }}>
          <LinearGradient
            colors={[COLORS.greenDeep, COLORS.greenMid]}
            style={layoutStyles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[layoutStyles.headerContent, { width: '100%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <View style={{ flex: 1 }}>
                  <Text style={layoutStyles.brandName}>Annsetu</Text>
                  <Text style={layoutStyles.brandTagline}>Empowering Indian Agrarian Cold Storage Systems</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => supabase.auth.signOut()} 
                  style={{ padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, marginLeft: 12 }}
                  activeOpacity={0.7}
                >
                  <Feather name="log-out" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={layoutStyles.headerAccent} />
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Navigation Tab Bar */}
      <View style={layoutStyles.tabOuterContainer}>
        <View style={layoutStyles.tabContainer}>
          {/* Mandi Prices Tab */}
          <TouchableOpacity
            style={[layoutStyles.tabButton, activeTab === 'prices' && { backgroundColor: COLORS.greenDeep, borderRadius: 26 }]}
            onPress={() => setActiveTab('prices')}
            activeOpacity={0.9}
          >
            <Text style={[layoutStyles.tabText, activeTab === 'prices' && layoutStyles.tabTextActive]}>
              Mandi
            </Text>
          </TouchableOpacity>

          {/* Farmer Storage/Lookup Tab */}
          <TouchableOpacity
            style={[layoutStyles.tabButton, activeTab === 'storage' && { backgroundColor: COLORS.greenDeep, borderRadius: 26 }]}
            onPress={() => setActiveTab('storage')}
            activeOpacity={0.9}
          >
            <Text style={[layoutStyles.tabText, activeTab === 'storage' && layoutStyles.tabTextActive]}>
              Farmer
            </Text>
          </TouchableOpacity>

          {/* Cold Storage Tab */}
          <TouchableOpacity
            style={[layoutStyles.tabButton, activeTab === 'cold_storage' && { backgroundColor: COLORS.greenDeep, borderRadius: 26 }]}
            onPress={() => setActiveTab('cold_storage')}
            activeOpacity={0.9}
          >
            <Text style={[layoutStyles.tabText, activeTab === 'cold_storage' && layoutStyles.tabTextActive]}>
              Storage
            </Text>
          </TouchableOpacity>

          {/* Weather Tab */}
          <TouchableOpacity
            style={[layoutStyles.tabButton, activeTab === 'weather' && { backgroundColor: COLORS.greenDeep, borderRadius: 26 }]}
            onPress={() => setActiveTab('weather')}
            activeOpacity={0.9}
          >
            <Text style={[layoutStyles.tabText, activeTab === 'weather' && layoutStyles.tabTextActive]}>
              Weather
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={layoutStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'prices' && <MandiTab />}
        {activeTab === 'storage' && <StorageTab setActiveTab={setActiveTab} />}
        {activeTab === 'cold_storage' && <ColdStorageTab setActiveTab={setActiveTab} />}
        {activeTab === 'weather' && <WeatherTab />}
      </ScrollView>

      {/* Footer */}
      <View style={layoutStyles.footer}>
        <Text style={layoutStyles.footerText}>
          {activeTab === 'prices'
            ? 'Data directly from data.gov.in'
            : activeTab === 'storage'
            ? 'Data directly from PostgreSQL database'
            : activeTab === 'weather'
            ? 'Data directly from WeatherAPI.com'
            : 'Annsetu Agrarian Platform'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
