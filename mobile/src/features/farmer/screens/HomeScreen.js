import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Keyboard } from 'react-native';
import { COLORS } from '../../../core/theme/theme';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import MandiTab from '../../mandi/screens/MandiTab';
import StockTab from '../../inventory/screens/StockTab';
import KhataTab from './KhataTab';
import ProfileTab from './ProfileTab';
import FarmerSelector from './FarmerSelector';
import FarmerDashboard from './FarmerDashboard';
import WeatherTab from '../../weather/screens/WeatherTab';
import BookStorageTab from './BookStorageTab';
import ErrorCard from '../../../core/components/ErrorCard';
import RegisterFarmerModal from '../modals/RegisterFarmerModal';
import NotificationsTab from '../../notifications/screens/NotificationsTab';
import DispatchTab from './DispatchTab';

import { useStorageTabDashboard } from '../hooks/useStorageTabDashboard';
import layoutStyles from '../styles/layoutStyles';

export default function HomeScreen({ loggedInPhone, onSwitchRole, onLogout }) {
  const { t } = useTranslation();
  // Navigation: 'home', 'stock', 'market', 'khata', 'profile'
  const [activeTab, setActiveTab] = useState('home');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Load the shared database state for the active farmer
  const {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery, selectedFarmerId, setSelectedFarmerId,
    farmerLoading, farmerData, setFarmerData, farmerError, holdingsList, ledgerList, notificationsList, setNotificationsList, weatherData, dataLoading,
    registerModalVisible, setRegisterModalVisible, loadDbFarmers, handleSelectFarmer
  } = useStorageTabDashboard(loggedInPhone);

  useEffect(() => {
    if (notificationsList && notificationsList.length > 0) {
      const hasUnread = notificationsList.some(n => !n.isRead);
      setHasUnreadNotifications(hasUnread);
    } else {
      setHasUnreadNotifications(false);
    }
  }, [notificationsList]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      setHasUnreadNotifications(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedFarmerId) return;

    const { fetchNotifications, subscribeToNotifications } = require('../../notifications/services/notificationService');

    let isMounted = true;
    fetchNotifications(selectedFarmerId)
      .then(list => {
        if (isMounted) setNotificationsList(list || []);
      })
      .catch(err => {
        console.warn('HomeScreen initial notification fetch failed:', err.message);
      });

    const unsubscribe = subscribeToNotifications(
      selectedFarmerId,
      (newNotif) => {
        setNotificationsList(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [{
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            createdAt: newNotif.createdAt,
            isRead: newNotif.isRead,
            timeLabel: 'Just now',
            actionUrl: newNotif.actionUrl
          }, ...prev];
        });
      },
      (updatedNotif) => {
        setNotificationsList(prev => prev.map(n => n.id === updatedNotif.id ? { ...n, isRead: updatedNotif.isRead } : n));
      },
      (deletedNotif) => {
        setNotificationsList(prev => prev.filter(n => n.id !== deletedNotif.id));
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedFarmerId]);


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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={layoutStyles.container}>
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
                hasUnreadNotifications={hasUnreadNotifications}
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
                onMarkRead={() => {
                  const { fetchNotifications } = require('../../notifications/services/notificationService');
                  fetchNotifications(selectedFarmerId).then(list => {
                    setNotificationsList(list || []);
                  }).catch(() => { });
                }}
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
              <KhataTab
                farmerData={farmerData}
                ledgerList={ledgerList}
                holdingsList={holdingsList}
                onPaymentSuccess={() => handleSelectFarmer(selectedFarmerId, true)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileTab
                farmerData={farmerData}
                onSwitchRole={onSwitchRole}
                onLogout={onLogout}
                onRefreshFarmer={() => handleSelectFarmer(selectedFarmerId)}
                loggedInPhone={loggedInPhone}
                userRole="Farmer"
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
          {!isKeyboardVisible && activeTab !== 'weather' && activeTab !== 'book' && (
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
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'home' && layoutStyles.bottomNavLabelActive]}>{t('nav.tab_home')}</Text>
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
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'stock' && layoutStyles.bottomNavLabelActive]}>{t('nav.tab_stock')}</Text>
              </TouchableOpacity>

              {/* Tab 3: Market */}
              <TouchableOpacity
                style={layoutStyles.bottomNavTab}
                onPress={() => setActiveTab('market')}
                activeOpacity={0.7}
              >
                <View style={[layoutStyles.iconWrapper, activeTab === 'market' && layoutStyles.iconWrapperActive]}>
                  <Feather name="trending-up" size={activeTab === 'market' ? 20 : 19} color={activeTab === 'market' ? '#1E5C2E' : '#71717A'} />
                </View>
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'market' && layoutStyles.bottomNavLabelActive]}>{t('nav.tab_market')}</Text>
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
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'khata' && layoutStyles.bottomNavLabelActive]}>{t('nav.tab_khata')}</Text>
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
                <Text style={[layoutStyles.bottomNavLabel, activeTab === 'profile' && layoutStyles.bottomNavLabelActive]}>{t('nav.tab_profile')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
