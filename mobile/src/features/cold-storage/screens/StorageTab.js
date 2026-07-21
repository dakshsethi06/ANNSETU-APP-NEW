import React, { useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../../../core/theme/theme';
import ErrorCard from '../../../core/components/ErrorCard';
import RegisterFarmerModal from '../../farmer/modals/RegisterFarmerModal';
import AmadModal from '../../farmer/modals/AmadModal';
import MyStockModal from '../../farmer/modals/MyStockModal';
import NotificationsModal from '../../notifications/modals/NotificationsModal';
import FarmerSelector from '../../farmer/screens/FarmerSelector';
import FarmerDashboard from '../../farmer/screens/FarmerDashboard';
import { useStorageTabDashboard } from '../../farmer/hooks/useStorageTabDashboard';

export default function StorageTab({ setActiveTab, onFullScreenChange }) {
  const {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery, selectedFarmerId, setSelectedFarmerId,
    farmerLoading, farmerData, setFarmerData, farmerError, holdingsList, notificationsList, setNotificationsList, dataLoading,
    registerModalVisible, setRegisterModalVisible, amadModalVisible, setAmadModalVisible,
    myStockModalVisible, setMyStockModalVisible, notificationsModalVisible, setNotificationsModalVisible,
    loadDbFarmers, handleSelectFarmer, markAllNotificationsAsRead
  } = useStorageTabDashboard();

  // Notify parent about full-screen state changes
  const isFullScreen = !!selectedFarmerId && !!farmerData && !farmerLoading && !dataLoading && !farmerError;

  useEffect(() => {
    if (onFullScreenChange) {
      onFullScreenChange(isFullScreen);
    }
  }, [isFullScreen]);

  const handleActionPress = (label) => {
    if (label === 'My Stock') setMyStockModalVisible(true);
    else if (label === 'Mandi Rates') setActiveTab('prices');
    else if (label === 'Weather') setActiveTab('weather');
    else if (label === 'Book Space') setAmadModalVisible(true);
    else Alert.alert(label, `${label} feature coming soon.`);
  };

  const renderContent = () => {
    if (isFullScreen) {
      return (
        <FarmerDashboard
          farmerData={farmerData}
          holdingsList={holdingsList}
          notifications={notificationsList}
          hasUnreadNotifications={notificationsList.some(n => !n.isRead)}
          onBackPress={() => { setSelectedFarmerId(null); setFarmerData(null); setNotificationsList([]); }}
          onNotificationsPress={() => {
            setNotificationsModalVisible(true);
            markAllNotificationsAsRead();
          }}
          onActionPress={handleActionPress}
        />
      );
    }

    if (dbFarmersLoading) {
      return <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />;
    }

    if (!selectedFarmerId) {
      return (
        <FarmerSelector
          farmers={dbFarmers}
          searchQuery={farmerSearchQuery}
          onSearchQueryChange={setFarmerSearchQuery}
          onSelectFarmer={handleSelectFarmer}
          onRegisterPress={() => setRegisterModalVisible(true)}
        />
      );
    }

    if (farmerLoading || dataLoading) {
      return <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />;
    }

    if (farmerError) {
      return <ErrorCard message={farmerError} onRetry={() => handleSelectFarmer(selectedFarmerId)} />;
    }

    return null;
  };

  return (
    <View style={{ flex: 1 }}>
      {renderContent()}

      <RegisterFarmerModal visible={registerModalVisible} onClose={() => setRegisterModalVisible(false)} onRegisterSuccess={loadDbFarmers} />
      <AmadModal visible={amadModalVisible} onClose={() => setAmadModalVisible(false)} dbFarmers={dbFarmers} defaultFarmerId={selectedFarmerId} onAmadSuccess={() => selectedFarmerId && handleSelectFarmer(selectedFarmerId)} />
      <MyStockModal visible={myStockModalVisible} onClose={() => setMyStockModalVisible(false)} holdingsList={holdingsList} />
      <NotificationsModal visible={notificationsModalVisible} onClose={() => setNotificationsModalVisible(false)} notifications={notificationsList} />
    </View>
  );
}
