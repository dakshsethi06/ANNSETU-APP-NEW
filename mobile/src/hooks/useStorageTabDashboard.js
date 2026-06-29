import { useState, useEffect } from 'react';
import { fetchFarmers } from '../services/api';
import { fetchHoldings } from '../services/amadService';
import { fetchNotifications } from '../services/notificationService';

export function useStorageTabDashboard() {
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

  return {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery,
    selectedFarmerId, setSelectedFarmerId, farmerLoading, farmerData, setFarmerData, farmerError,
    holdingsList, notificationsList, setNotificationsList, dataLoading,
    registerModalVisible, setRegisterModalVisible, amadModalVisible, setAmadModalVisible,
    myStockModalVisible, setMyStockModalVisible, notificationsModalVisible, setNotificationsModalVisible,
    loadDbFarmers, handleSelectFarmer
  };
}
