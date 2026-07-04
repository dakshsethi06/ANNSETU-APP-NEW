import { useState, useEffect } from 'react';
import { fetchFarmers, fetchFarmerLedger, fetchWeather } from '../../../core/network/api';
import { fetchHoldings } from '../../mandi/services/amadService';
import { fetchNotifications } from '../../notifications/services/notificationService';

export function useStorageTabDashboard(loggedInPhone) {
  const [dbFarmers, setDbFarmers] = useState([]);
  const [dbFarmersLoading, setDbFarmersLoading] = useState(false);
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [farmerData, setFarmerData] = useState(null);
  const [farmerError, setFarmerError] = useState(null);
  const [holdingsList, setHoldingsList] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [ledgerList, setLedgerList] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
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
      let list = farmers || [];
      
      if (loggedInPhone) {
        const cleanPhone = loggedInPhone.replace('+91', '').trim();
        let found = list.find(f => (f.phone && f.phone.trim() === cleanPhone) || (f.serial_number && f.serial_number.trim() === cleanPhone));
        if (!found) {
          found = {
            serial_number: cleanPhone,
            name: 'Farmer ' + cleanPhone,
            phone: cleanPhone,
            state: 'Uttar Pradesh',
            commodity: 'Potato',
            pendingRent: 0,
          };
        }
        list = [found];
        setDbFarmers(list);
        handleSelectFarmer(found.serial_number);
      } else {
        setDbFarmers(list);
        if (list.length > 0) {
          handleSelectFarmer(list[0].serial_number);
        }
      }
    } catch (err) {
      console.warn('Failed to load database farmers:', err.message);
      if (loggedInPhone) {
        const cleanPhone = loggedInPhone.replace('+91', '').trim();
        const fallback = {
          serial_number: cleanPhone,
          name: 'Farmer ' + cleanPhone,
          phone: cleanPhone,
          state: 'Uttar Pradesh',
          commodity: 'Potato',
          pendingRent: 0,
        };
        setDbFarmers([fallback]);
        handleSelectFarmer(fallback.serial_number);
      } else {
        setDbFarmers([]);
        setFarmerError(err.message || 'Failed to load farmers from database');
      }
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
      let selectedFarmer = null;
      if (farmers && farmers.length > 0) {
        selectedFarmer = farmers[0];
      } else {
        // Check local list for fallback profile (e.g. for new or unregistered login numbers)
        const local = dbFarmers.find(f => f.serial_number === farmerId);
        if (local) {
          selectedFarmer = local;
        }
      }

      if (selectedFarmer) {
        setFarmerData(selectedFarmer);
      } else {
        throw new Error('Farmer profile not found.');
      }
      
      const cityToQuery = selectedFarmer.village || selectedFarmer.district || selectedFarmer.state || 'Tundla';

      const [holdings, notifications, ledger, weather] = await Promise.all([
        fetchHoldings(),
        fetchNotifications(farmerId),
        fetchFarmerLedger(farmerId),
        fetchWeather(cityToQuery).catch(async () => {
          // Fallback to district/state if village failed
          if (selectedFarmer.district && cityToQuery !== selectedFarmer.district) {
            try { return await fetchWeather(selectedFarmer.district); } catch (e) { }
          }
          return null;
        })
      ]);

      setHoldingsList(holdings.filter((h) => h.id === farmerId) || []);
      setNotificationsList(notifications || []);
      setLedgerList(ledger || []);
      setWeatherData(weather);
    } catch (err) {
      console.warn('Failed to fetch live farmer data:', err.message);
      setFarmerError(err.message || 'Failed to load farmer details');
      setFarmerData(null);
      setHoldingsList([]);
      setNotificationsList([]);
      setLedgerList([]);
      setWeatherData(null);
    } finally {
      setFarmerLoading(false);
      setDataLoading(false);
    }
  };

  return {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery,
    selectedFarmerId, setSelectedFarmerId, farmerLoading, farmerData, setFarmerData, farmerError,
    holdingsList, notificationsList, setNotificationsList, ledgerList, weatherData, dataLoading,
    registerModalVisible, setRegisterModalVisible, amadModalVisible, setAmadModalVisible,
    myStockModalVisible, setMyStockModalVisible, notificationsModalVisible, setNotificationsModalVisible,
    loadDbFarmers, handleSelectFarmer
  };
}
