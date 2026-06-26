import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { fetchFarmers, fetchHoldings, fetchNotifications } from '../../services/api';
import { COLORS } from '../../theme';
import ErrorCard from '../../components/ErrorCard';
import RegisterFarmerModal from './modals/RegisterFarmerModal';
import AmadModal from './modals/AmadModal';
import MyStockModal from './modals/MyStockModal';
import NotificationsModal from './modals/NotificationsModal';
import FarmerSelector from './FarmerSelector';
import FarmerDashboard from './FarmerDashboard';
import layoutStyles from './styles/layoutStyles';

export default function StorageTab({ setActiveTab }) {
  const [dbFarmers, setDbFarmers] = useState([]);
  const [dbFarmersLoading, setDbFarmersLoading] = useState(false);
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');

  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [farmerData, setFarmerData] = useState(null);
  const [farmerError, setFarmerError] = useState(null);

  const [holdingsList, setHoldingsList] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [amadModalVisible, setAmadModalVisible] = useState(false);
  const [myStockModalVisible, setMyStockModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  useEffect(() => {
    loadDbFarmers();
  }, []);

  const loadDbFarmers = async () => {
    setDbFarmersLoading(true);
    try {
      const farmers = await fetchFarmers();
      setDbFarmers(farmers || []);
    } catch (err) {
      console.warn('Failed to load database farmers:', err.message);
    } finally {
      setDbFarmersLoading(false);
    }
  };

  const handleSelectFarmer = async (farmerId) => {
    setSelectedFarmerId(farmerId);
    setFarmerLoading(true);
    setFarmerError(null);
    setDataLoading(true);
    try {
      const farmers = await fetchFarmers('', farmerId);
      if (farmers && farmers.length > 0) {
        setFarmerData(farmers[0]);
      } else {
        throw new Error('Farmer profile not found.');
      }
      
      const [holdings, notifications] = await Promise.all([
        fetchHoldings(),
        fetchNotifications(farmerId)
      ]);

      setHoldingsList(holdings.filter((h) => h.id === farmerId) || []);
      setNotificationsList(notifications || []);
    } catch (err) {
      setFarmerError(err.message);
    } finally {
      setFarmerLoading(false);
      setDataLoading(false);
    }
  };

  const handleActionPress = (label) => {
    if (label === 'My Stock') setMyStockModalVisible(true);
    else if (label === 'Mandi Rates') setActiveTab('prices');
    else if (label === 'Weather') setActiveTab('weather');
    else if (label === 'Book Space') setAmadModalVisible(true);
    else Alert.alert(label, `${label} feature coming soon.`);
  };

  return (
    <View style={layoutStyles.tabContent}>
      {dbFarmersLoading ? (
        <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
      ) : !selectedFarmerId ? (
        <FarmerSelector
          farmers={dbFarmers}
          searchQuery={farmerSearchQuery}
          onSearchQueryChange={setFarmerSearchQuery}
          onSelectFarmer={handleSelectFarmer}
          onRegisterPress={() => setRegisterModalVisible(true)}
        />
      ) : farmerLoading || dataLoading ? (
        <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
      ) : farmerError ? (
        <ErrorCard message={farmerError} onRetry={() => handleSelectFarmer(selectedFarmerId)} />
      ) : farmerData ? (
        <FarmerDashboard
          farmerData={farmerData}
          holdingsList={holdingsList}
          notifications={notificationsList}
          onBackPress={() => {
            setSelectedFarmerId(null);
            setFarmerData(null);
            setNotificationsList([]);
          }}
          onNotificationsPress={() => setNotificationsModalVisible(true)}
          onActionPress={handleActionPress}
        />
      ) : null}

      <RegisterFarmerModal
        visible={registerModalVisible}
        onClose={() => setRegisterModalVisible(false)}
        onRegisterSuccess={loadDbFarmers}
      />
      <AmadModal
        visible={amadModalVisible}
        onClose={() => setAmadModalVisible(false)}
        dbFarmers={dbFarmers}
        defaultFarmerId={selectedFarmerId}
        onAmadSuccess={() => selectedFarmerId && handleSelectFarmer(selectedFarmerId)}
      />
      <MyStockModal
        visible={myStockModalVisible}
        onClose={() => setMyStockModalVisible(false)}
        holdingsList={holdingsList}
      />
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        notifications={notificationsList}
      />
    </View>
  );
}
