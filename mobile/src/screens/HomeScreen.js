import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { Feather } from '@expo/vector-icons';

import MandiTab from './home/MandiTab';
import StockTab from './home/StockTab';
import KhataTab from './home/KhataTab';
import ProfileTab from './home/ProfileTab';
import FarmerSelector from './home/FarmerSelector';
import FarmerDashboard from './home/FarmerDashboard';
import WeatherTab from './home/WeatherTab';
import BookStorageTab from './home/BookStorageTab';
import ErrorCard from '../components/ErrorCard';
import RegisterFarmerModal from './home/modals/RegisterFarmerModal';
import NotificationsTab from './home/NotificationsTab';
import DispatchTab from './home/DispatchTab';

import { useStorageTabDashboard } from '../hooks/useStorageTabDashboard';
import layoutStyles from './home/styles/layoutStyles';
import HomeHeader from '../components/HomeHeader';
import { supabase } from '../services/supabase';

export default function HomeScreen({ loggedInPhone, onSwitchRole, onLogout }) {
  // Navigation: 'home', 'stock', 'market', 'khata', 'profile'
  const [activeTab, setActiveTab] = useState('home');

  // Load the shared database state for the active farmer
  const {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery, selectedFarmerId, setSelectedFarmerId,
    farmerLoading, farmerData, setFarmerData, farmerError, holdingsList, ledgerList, notificationsList, setNotificationsList, weatherData, dataLoading,
    registerModalVisible, setRegisterModalVisible, loadDbFarmers, handleSelectFarmer
  } = useStorageTabDashboard(loggedInPhone);

  // If a farmer is selected and loaded successfully, we show the bottom nav dashboard view.
  const hasSelectedFarmer = !!selectedFarmerId && !!farmerData && !farmerLoading && !dataLoading && !farmerError;

  // Computed values
  const calcStockMt = holdingsList.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0) * 0.1;
  const calcBags = holdingsList.reduce((sum, h) => sum + (h.bags || 0), 0);

  const displayStockMt = calcStockMt;
  const displayBags = calcBags;

  // Sync state changes
  const handleActionPress = (label) => {
    if (label === 'My Stock') setActiveTab('stock');
    else if (label === 'Mandi Rates') setActiveTab('market');
    else if (label === 'My Khata') setActiveTab('khata');
    else if (label === 'Profile') setActiveTab('profile');
    else if (label === 'Weather') setActiveTab('weather');
    else if (label === 'Book Space') setActiveTab('book');
    else if (label === 'Dispatch') setActiveTab('dispatch');
    else {
      console.log(label);
    }
  };

  const handleBackToSelector = () => {
    setSelectedFarmerId(null);
    setFarmerData(null);
    setNotificationsList([]);
    setActiveTab('home');
  };

  // Status bar styling
  const getStatusStyle = () => {
    if (hasSelectedFarmer) return 'dark-content';
    return 'light-content';
  };

  const getStatusColor = () => {
    if (hasSelectedFarmer) return '#FAF7F0';
    return COLORS.greenDeep;
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={layoutStyles.container}>
      <StatusBar barStyle={getStatusStyle()} backgroundColor={getStatusColor()} />

      {/* ─── Case A: Selecting a Farmer ─── */}
      {!hasSelectedFarmer ? (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
          {dbFarmersLoading || farmerLoading || dataLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.greenDeep} />
            </View>
          ) : farmerError ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ErrorCard message={farmerError} onRetry={() => handleSelectFarmer(selectedFarmerId)} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FarmerSelector
                farmers={dbFarmers}
                searchQuery={farmerSearchQuery}
                onSearchQueryChange={setFarmerSearchQuery}
                onSelectFarmer={handleSelectFarmer}
                onRegisterPress={() => setRegisterModalVisible(true)}
              />
            </View>
          )}

          <RegisterFarmerModal
            visible={registerModalVisible}
            onClose={() => setRegisterModalVisible(false)}
            onRegisterSuccess={loadDbFarmers}
          />
        </View>
      ) : (
        /* ─── Case B: Redesigned Farmer App Layout with Root Bottom Tabs ─── */
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            {activeTab === 'home' && (
              <FarmerDashboard
                farmerData={farmerData}
                holdingsList={holdingsList}
                notifications={notificationsList}
                weatherData={weatherData}
                onBackPress={loggedInPhone ? null : handleBackToSelector}
                onNotificationsPress={() => setActiveTab('notifications')}
                onActionPress={handleActionPress}
                manualStockMt={displayStockMt}
                manualBags={displayBags}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab
                farmerId={selectedFarmerId}
                onBack={() => setActiveTab('home')}
                onNavigateToTab={(tabName) => setActiveTab(tabName)}
              />
            )}

            {activeTab === 'stock' && (
              <StockTab
                holdingsList={holdingsList}
              />
            )}


            {activeTab === 'market' && (
              <MandiTab defaultState={farmerData.state || 'Uttar Pradesh'} />
            )}

            {activeTab === 'khata' && (
              <KhataTab farmerData={farmerData} ledgerList={ledgerList} />
            )}

            {activeTab === 'profile' && (
              <ProfileTab 
                farmerData={farmerData} 
                onSwitchRole={onSwitchRole} 
                onLogout={onLogout} 
              />
            )}

            {activeTab === 'weather' && (
              <WeatherTab farmerData={farmerData} onBackPress={() => setActiveTab('home')} />
            )}

            {activeTab === 'book' && (
              <BookStorageTab
                farmerData={farmerData}
                onBackPress={() => setActiveTab('home')}
                onBookingSuccess={() => {
                  handleSelectFarmer(selectedFarmerId);
                  setActiveTab('home');
                }}
              />
            )}

            {activeTab === 'dispatch' && (
              <DispatchTab
                farmerId={selectedFarmerId}
                onBackPress={() => setActiveTab('home')}
              />
            )}
          </View>

          {/* ─── Elevated Bottom Tab Navigation ─── */}
          {activeTab !== 'weather' && activeTab !== 'book' && (
            <View style={layoutStyles.bottomNav}>
              {/* Tab 1: Home */}
              <TouchableOpacity
                style={layoutStyles.bottomNavTab}
                onPress={() => setActiveTab('home')}
                activeOpacity={0.7}
              >
                <View style={[layoutStyles.iconWrapper, activeTab === 'home' && layoutStyles.iconWrapperActive]}>
                  <Feather name="home" size={activeTab === 'home' ? 20 : 19} color={activeTab === 'home' ? '#1E5C2E' : '#71717A'} />
                </View>
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'home' && layoutStyles.bottomNavLabelActive]}>Home</Text>
              </TouchableOpacity>

              {/* Tab 2: My Stock */}
              <TouchableOpacity
                style={layoutStyles.bottomNavTab}
                onPress={() => setActiveTab('stock')}
                activeOpacity={0.7}
              >
                <View style={[layoutStyles.iconWrapper, activeTab === 'stock' && layoutStyles.iconWrapperActive]}>
                  <Feather name="package" size={activeTab === 'stock' ? 20 : 19} color={activeTab === 'stock' ? '#1E5C2E' : '#71717A'} />
                </View>
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'stock' && layoutStyles.bottomNavLabelActive]}>My Stock</Text>
              </TouchableOpacity>

              {/* Tab 3: Dispatch */}
              <TouchableOpacity
                style={layoutStyles.bottomNavTab}
                onPress={() => setActiveTab('dispatch')}
                activeOpacity={0.7}
              >
                <View style={[layoutStyles.iconWrapper, activeTab === 'dispatch' && layoutStyles.iconWrapperActive]}>
                  <Feather name="truck" size={activeTab === 'dispatch' ? 20 : 19} color={activeTab === 'dispatch' ? '#1E5C2E' : '#71717A'} />
                </View>
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'dispatch' && layoutStyles.bottomNavLabelActive]}>Dispatch</Text>
              </TouchableOpacity>

              {/* Tab 4: Market */}
              <TouchableOpacity
                style={layoutStyles.bottomNavTab}
                onPress={() => setActiveTab('market')}
                activeOpacity={0.7}
              >
                <View style={[layoutStyles.iconWrapper, activeTab === 'market' && layoutStyles.iconWrapperActive]}>
                  <Feather name="trending-up" size={activeTab === 'market' ? 20 : 19} color={activeTab === 'market' ? '#1E5C2E' : '#71717A'} />
                </View>
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'market' && layoutStyles.bottomNavLabelActive]}>Market</Text>
              </TouchableOpacity>

              {/* Tab 5: Khata */}
              <TouchableOpacity
                style={layoutStyles.bottomNavTab}
                onPress={() => setActiveTab('khata')}
                activeOpacity={0.7}
              >
                <View style={[layoutStyles.iconWrapper, activeTab === 'khata' && layoutStyles.iconWrapperActive]}>
                  <Feather name="book-open" size={activeTab === 'khata' ? 20 : 19} color={activeTab === 'khata' ? '#1E5C2E' : '#71717A'} />
                </View>
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'khata' && layoutStyles.bottomNavLabelActive]}>Khata</Text>
              </TouchableOpacity>

              {/* Tab 6: Profile */}
              <TouchableOpacity
                style={layoutStyles.bottomNavTab}
                onPress={() => setActiveTab('profile')}
                activeOpacity={0.7}
              >
                <View style={[layoutStyles.iconWrapper, activeTab === 'profile' && layoutStyles.iconWrapperActive]}>
                  <Feather name="user" size={activeTab === 'profile' ? 20 : 19} color={activeTab === 'profile' ? '#1E5C2E' : '#71717A'} />
                </View>
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'profile' && layoutStyles.bottomNavLabelActive]}>Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

