import React from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../../theme';
import ErrorCard from '../../components/ErrorCard';
import RegisterFarmerModal from './modals/RegisterFarmerModal';
import AmadModal from './modals/AmadModal';
import MyStockModal from './modals/MyStockModal';
import NotificationsModal from './modals/NotificationsModal';
import FarmerSelector from './FarmerSelector';
import FarmerDashboard from './FarmerDashboard';
import layoutStyles from './styles/layoutStyles';
import { useStorageTabDashboard } from '../../hooks/useStorageTabDashboard';

export default function StorageTab({ setActiveTab }) {
  const {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery, selectedFarmerId, setSelectedFarmerId,
    farmerLoading, farmerData, setFarmerData, farmerError, holdingsList, notificationsList, setNotificationsList, dataLoading,
    registerModalVisible, setRegisterModalVisible, amadModalVisible, setAmadModalVisible,
    myStockModalVisible, setMyStockModalVisible, notificationsModalVisible, setNotificationsModalVisible,
    loadDbFarmers, handleSelectFarmer
  } = useStorageTabDashboard();

  const handleActionPress = (label) => {
    if (label === 'My Stock') setMyStockModalVisible(true);
    else if (label === 'Mandi Rates') setActiveTab('prices');
    else if (label === 'Weather') setActiveTab('weather');
    else if (label === 'Book Space') setAmadModalVisible(true);
    else Alert.alert(label, `${label} feature coming soon.`);
  };

  return (
    <View style={layoutStyles.tabContent}>
      {dbFarmersLoading ? <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
      : !selectedFarmerId ? (
        <FarmerSelector farmers={dbFarmers} searchQuery={farmerSearchQuery} onSearchQueryChange={setFarmerSearchQuery} onSelectFarmer={handleSelectFarmer} onRegisterPress={() => setRegisterModalVisible(true)} />
      ) : farmerLoading || dataLoading ? <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
      : farmerError ? <ErrorCard message={farmerError} onRetry={() => handleSelectFarmer(selectedFarmerId)} />
      : farmerData ? (
        <FarmerDashboard
          farmerData={farmerData} holdingsList={holdingsList} notifications={notificationsList}
          onBackPress={() => { setSelectedFarmerId(null); setFarmerData(null); setNotificationsList([]); }}
          onNotificationsPress={() => setNotificationsModalVisible(true)} onActionPress={handleActionPress}
        />
      ) : null}

      <RegisterFarmerModal visible={registerModalVisible} onClose={() => setRegisterModalVisible(false)} onRegisterSuccess={loadDbFarmers} />
      <AmadModal visible={amadModalVisible} onClose={() => setAmadModalVisible(false)} dbFarmers={dbFarmers} defaultFarmerId={selectedFarmerId} onAmadSuccess={() => selectedFarmerId && handleSelectFarmer(selectedFarmerId)} />
      <MyStockModal visible={myStockModalVisible} onClose={() => setMyStockModalVisible(false)} holdingsList={holdingsList} />
      <NotificationsModal visible={notificationsModalVisible} onClose={() => setNotificationsModalVisible(false)} notifications={notificationsList} />
    </View>
  );
}
