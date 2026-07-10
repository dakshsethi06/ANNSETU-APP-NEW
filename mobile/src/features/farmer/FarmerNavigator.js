import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useStorageTabDashboard } from './hooks/useStorageTabDashboard';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../../core/theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FarmerSelector from './screens/FarmerSelector';
import RegisterFarmerModal from './modals/RegisterFarmerModal';
import FarmerDashboard from './screens/FarmerDashboard';
import StockTab from '../inventory/screens/StockTab';
import MandiTab from '../mandi/screens/MandiTab';
import KhataTab from './screens/KhataTab';
import ProfileTab from './screens/ProfileTab';
import NotificationsTab from '../notifications/screens/NotificationsTab';
import WeatherTab from '../weather/screens/WeatherTab';
import BookStorageTab from './screens/BookStorageTab';
import DispatchTab from './screens/DispatchTab';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function FarmerTabs({ route }) {
  const { 
    farmerData, 
    holdingsList, 
    notificationsList, 
    hasUnreadNotifications, 
    weatherData, 
    displayStockMt, 
    displayBags, 
    ledgerList, 
    onSwitchRole, 
    onLogout, 
    loggedInPhone, 
    onBackPress, 
    onRefreshFarmer 
  } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E5C2E',
        tabBarInactiveTintColor: '#71717A',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 10,
          paddingTop: 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard"
        options={{
          tabBarLabel: t('nav.tab_home'),
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />
        }}
      >
        {({ navigation }) => (
          <FarmerDashboard
            farmerData={farmerData}
            holdingsList={holdingsList}
            notifications={notificationsList}
            hasUnreadNotifications={hasUnreadNotifications}
            weatherData={weatherData}
            onBackPress={onBackPress}
            onNotificationsPress={() => navigation.navigate('Notifications')}
            onActionPress={(label) => {
              if (label === 'My Stock') navigation.navigate('Stock');
              else if (label === 'Mandi Rates') navigation.navigate('Mandi');
              else if (label === 'My Khata') navigation.navigate('Khata');
              else if (label === 'Profile') navigation.navigate('Profile');
              else if (label === 'Weather') navigation.navigate('Weather');
              else if (label === 'Book Space') navigation.navigate('BookStorage');
              else if (label === 'Dispatch') navigation.navigate('Dispatch');
            }}
            manualStockMt={displayStockMt}
            manualBags={displayBags}
          />
        )}
      </Tab.Screen>

      <Tab.Screen 
        name="Stock"
        options={{
          tabBarLabel: t('nav.tab_stock'),
          tabBarIcon: ({ color, size }) => <Feather name="package" color={color} size={size} />
        }}
      >
        {() => <StockTab holdingsList={holdingsList} />}
      </Tab.Screen>

      <Tab.Screen 
        name="Mandi"
        options={{
          tabBarLabel: t('nav.tab_market'),
          tabBarIcon: ({ color, size }) => <Feather name="trending-up" color={color} size={size} />
        }}
      >
        {() => <MandiTab defaultState={farmerData.state || 'Uttar Pradesh'} />}
      </Tab.Screen>

      <Tab.Screen 
        name="Khata"
        options={{
          tabBarLabel: t('nav.tab_khata'),
          tabBarIcon: ({ color, size }) => <Feather name="book-open" color={color} size={size} />
        }}
      >
        {() => (
          <KhataTab
            farmerData={farmerData}
            ledgerList={ledgerList}
            holdingsList={holdingsList}
            onPaymentSuccess={onRefreshFarmer}
          />
        )}
      </Tab.Screen>

      <Tab.Screen 
        name="Profile"
        options={{
          tabBarLabel: t('nav.tab_profile'),
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />
        }}
      >
        {() => (
          <ProfileTab
            farmerData={farmerData}
            onSwitchRole={onSwitchRole}
            onLogout={onLogout}
            onRefreshFarmer={onRefreshFarmer}
            loggedInPhone={loggedInPhone}
            userRole="Farmer"
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function FarmerNavigator({ loggedInPhone, onSwitchRole, onLogout }) {
  const {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery, selectedFarmerId, setSelectedFarmerId,
    farmerLoading, farmerData, setFarmerData, farmerError, holdingsList, ledgerList, notificationsList, setNotificationsList, weatherData, dataLoading,
    registerModalVisible, setRegisterModalVisible, loadDbFarmers, handleSelectFarmer
  } = useStorageTabDashboard(loggedInPhone);

  const hasSelectedFarmer = !!selectedFarmerId && !!farmerData && !farmerLoading && !dataLoading && !farmerError;

  const handleBackToSelector = () => {
    setSelectedFarmerId(null);
    setFarmerData(null);
    setNotificationsList([]);
  };

  const calcStockMt = holdingsList.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0) * 0.1;
  const calcBags = holdingsList.reduce((sum, h) => sum + (h.bags || 0), 0);

  if (dbFarmersLoading || farmerLoading || dataLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F0' }}>
        <ActivityIndicator size="large" color={COLORS.greenDeep} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!hasSelectedFarmer ? (
        <Stack.Screen name="Selector">
          {() => (
            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#FAF7F0' }}>
              <FarmerSelector
                farmers={dbFarmers}
                searchQuery={farmerSearchQuery}
                onSearchQueryChange={setFarmerSearchQuery}
                onSelectFarmer={handleSelectFarmer}
                onRegisterPress={() => setRegisterModalVisible(true)}
                onLogout={onLogout}
              />
              <RegisterFarmerModal
                visible={registerModalVisible}
                onClose={() => setRegisterModalVisible(false)}
                onRegisterSuccess={loadDbFarmers}
              />
            </View>
          )}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen 
            name="MainTabs" 
            component={FarmerTabs} 
            initialParams={{
              farmerData,
              holdingsList,
              notificationsList,
              hasUnreadNotifications: notificationsList.some(n => !n.isRead),
              weatherData,
              displayStockMt: calcStockMt,
              displayBags: calcBags,
              ledgerList,
              onSwitchRole,
              onLogout,
              loggedInPhone,
              onBackPress: loggedInPhone ? null : handleBackToSelector,
              onRefreshFarmer: () => handleSelectFarmer(selectedFarmerId),
            }}
          />
          <Stack.Screen name="Notifications">
            {({ navigation }) => (
              <NotificationsTab
                farmerId={selectedFarmerId}
                onBack={() => navigation.goBack()}
                onNavigateToTab={(tabName) => {
                  navigation.goBack();
                  navigation.navigate(tabName);
                }}
                onMarkRead={() => {
                  const { fetchNotifications } = require('../notifications/services/notificationService');
                  fetchNotifications(selectedFarmerId).then(list => {
                    setNotificationsList(list || []);
                  }).catch(() => { });
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Weather">
            {({ navigation }) => (
              <WeatherTab 
                farmerData={farmerData} 
                onBackPress={() => navigation.goBack()} 
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="BookStorage">
            {({ navigation }) => (
              <BookStorageTab
                farmerData={farmerData}
                onBackPress={() => navigation.goBack()}
                onBookingSuccess={() => {
                  handleSelectFarmer(selectedFarmerId);
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Dispatch">
            {({ navigation }) => (
              <DispatchTab
                farmerId={selectedFarmerId}
                onBackPress={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}
