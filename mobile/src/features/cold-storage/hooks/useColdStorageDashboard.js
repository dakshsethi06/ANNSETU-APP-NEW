import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { fetchColdStorageSummary, fetchColdStorages, fetchHoldings, fetchWeather } from '../../../core/network/api';

export function useColdStorageDashboard() {
  const [selectedColdStorageId, setSelectedColdStorageId] = useState('cmmp9txv0000ai3t4wush9trs');
  const [csSummary, setCsSummary] = useState(null);
  const [csLoading, setCsLoading] = useState(false);
  const [csError, setCsError] = useState(null);
  const [csWeather, setCsWeather] = useState(null);
  const [coldStoragesList, setColdStoragesList] = useState([]);
  const [coldStoragesLoading, setColdStoragesLoading] = useState(false);
  const [csModalVisible, setCsModalVisible] = useState(false);
  const [csRegisterModalVisible, setCsRegisterModalVisible] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);

  useEffect(() => {
    loadColdStorageData(selectedColdStorageId);
    loadColdStoragesList();
  }, [selectedColdStorageId]);

  const loadColdStoragesList = async () => {
    setColdStoragesLoading(true);
    try {
      const storages = await fetchColdStorages();
      setColdStoragesList(storages || []);
    } catch (err) {
      console.warn('Failed to load cold storages list:', err.message);
    } finally {
      setColdStoragesLoading(false);
    }
  };

  const loadColdStorageData = async (csId) => {
    setCsLoading(true);
    setCsError(null);
    try {
      const summary = await fetchColdStorageSummary(csId);
      setCsSummary(summary);
      const cityToQuery = summary.coldStorage.district || summary.coldStorage.city || 'Firozabad';
      try {
        const weather = await fetchWeather(cityToQuery);
        setCsWeather(weather);
      } catch (weatherErr) {}
    } catch (err) {
      setCsError(err.message);
      setCsSummary(null);
    } finally {
      setCsLoading(false);
    }
  };

  const handleOpenInventory = async () => {
    setInventoryModalVisible(true);
    setInventoryLoading(true);
    try {
      const holdings = await fetchHoldings();
      setInventoryList(holdings || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load inventory.');
    } finally {
      setInventoryLoading(false);
    }
  };

  return {
    selectedColdStorageId, setSelectedColdStorageId, csSummary, csLoading, csError, csWeather, loadColdStorageData,
    coldStoragesList, coldStoragesLoading,
    csModalVisible, setCsModalVisible,
    csRegisterModalVisible, setCsRegisterModalVisible,
    inventoryList, inventoryLoading, inventoryModalVisible, setInventoryModalVisible, handleOpenInventory
  };
}
