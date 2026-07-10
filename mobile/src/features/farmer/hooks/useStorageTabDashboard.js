import { useState, useEffect } from 'react';
import { fetchFarmers, fetchFarmerLedger } from '../services/farmerService';
import { fetchWeather } from '../../weather/services/weatherService';
import { fetchHoldings } from '../../mandi/services/amadService';
import { fetchNotifications } from '../../notifications/services/notificationService';
import { supabase } from '../../../core/network/supabase';

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

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!selectedFarmerId) return;

    const channel = supabase
      .channel('app-notifications-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'AppNotification',
          filter: `userId=eq.${selectedFarmerId}`,
        },
        (payload) => {
          console.log('[Realtime Notification] New notification payload:', payload.new);
          const newNotif = {
            id: payload.new.id,
            title: payload.new.title,
            message: payload.new.message,
            type: payload.new.type,
            createdAt: payload.new.createdAt,
            isRead: payload.new.isRead,
            actionUrl: payload.new.actionUrl,
            timeLabel: 'Just now'
          };
          setNotificationsList((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedFarmerId]);

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
        handleSelectFarmer(found.serial_number, false, found);
      } else {
        setDbFarmers(list);
        if (list.length > 0) {
          handleSelectFarmer(list[0].serial_number, false, list[0]);
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
        handleSelectFarmer(fallback.serial_number, false, fallback);
      } else {
        setDbFarmers([]);
        setFarmerError(err.message || 'Failed to load farmers from database');
      }
    } finally {
      setDbFarmersLoading(false);
    }
  };

  const handleSelectFarmer = async (farmerId, isRefresh = false, fallbackProfile = null) => {
    console.log('[handleSelectFarmer] Called with farmerId:', farmerId, 'isRefresh:', isRefresh);
    setSelectedFarmerId(farmerId);
    if (!isRefresh) {
      setFarmerLoading(true);
      setDataLoading(true);
    }
    setFarmerError(null);

    try {
      console.log('[handleSelectFarmer] Fetching farmer profile...');
      const farmers = await fetchFarmers('', farmerId);
      let selectedFarmer = null;
      if (farmers && farmers.length > 0) {
        selectedFarmer = farmers[0];
      } else {
        // Check local list for fallback profile (e.g. for new or unregistered login numbers)
        console.log('[handleSelectFarmer] Profile not found in API, checking local list/fallback...');
        const local = fallbackProfile || dbFarmers.find(f => f.serial_number === farmerId);
        if (local) {
          selectedFarmer = local;
        }
      }

      console.log('[handleSelectFarmer] Loaded selectedFarmer profile:', selectedFarmer);

      if (selectedFarmer) {
        setFarmerData(selectedFarmer);
      } else {
        throw new Error('Farmer profile not found.');
      }
      
      const cityToQuery = selectedFarmer.village || selectedFarmer.district || selectedFarmer.state || 'Tundla';
      console.log('[handleSelectFarmer] Fetching live holdings, notifications, ledger, and weather for:', cityToQuery);

      const [holdings, notifications, ledger, weather] = await Promise.all([
        fetchHoldings().catch(err => { console.warn('[handleSelectFarmer] fetchHoldings failed:', err.message); throw err; }),
        fetchNotifications(farmerId).catch(err => { console.warn('[handleSelectFarmer] fetchNotifications failed:', err.message); throw err; }),
        fetchFarmerLedger(farmerId).catch(err => { console.warn('[handleSelectFarmer] fetchFarmerLedger failed:', err.message); throw err; }),
        fetchWeather(cityToQuery).catch(async () => {
          // Fallback to district/state if village failed
          if (selectedFarmer.district && cityToQuery !== selectedFarmer.district) {
            try { return await fetchWeather(selectedFarmer.district); } catch (e) { }
          }
          return null;
        })
      ]);

      console.log('[handleSelectFarmer] All data fetched successfully. Holdings count:', holdings?.length, 'Ledger count:', ledger?.length);

      setHoldingsList(holdings.filter((h) => h.id === farmerId) || []);
      setNotificationsList(notifications || []);
      setLedgerList(ledger || []);
      setWeatherData(weather);
    } catch (err) {
      console.error('[handleSelectFarmer] Failed to fetch live farmer data. Error:', err.stack || err.message);
      if (!isRefresh) {
        setFarmerError(err.message || 'Failed to load farmer details');
        setFarmerData(null);
        setHoldingsList([]);
        setNotificationsList([]);
        setLedgerList([]);
        setWeatherData(null);
      }
    } finally {
      setFarmerLoading(false);
      setDataLoading(false);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unread = notificationsList.filter(n => !n.isRead);
    if (unread.length === 0) return;

    // Optimistically update UI
    setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      const { markNotificationRead } = require('../../notifications/services/notificationService');
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
    } catch (err) {
      console.warn('Failed to mark notifications read:', err.message);
    }
  };

  return {
    dbFarmers, dbFarmersLoading, farmerSearchQuery, setFarmerSearchQuery,
    selectedFarmerId, setSelectedFarmerId, farmerLoading, farmerData, setFarmerData, farmerError,
    holdingsList, notificationsList, setNotificationsList, ledgerList, weatherData, dataLoading,
    registerModalVisible, setRegisterModalVisible, amadModalVisible, setAmadModalVisible,
    myStockModalVisible, setMyStockModalVisible, notificationsModalVisible, setNotificationsModalVisible,
    loadDbFarmers, handleSelectFarmer, markAllNotificationsAsRead
  };
}
