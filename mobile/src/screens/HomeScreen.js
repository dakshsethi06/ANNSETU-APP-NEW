// =============================================
// HomeScreen — Annsetu App
// Tabs: Mandi Prices (with state selector) + Weather Info
// Enhanced Premium Agrarian UI
// =============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { fetchMandiPrices, fetchStates, fetchWeather, fetchFarmers, addFarmer, fetchHoldings, fetchColdStorageSummary, fetchColdStorages, addColdStorage, addAmad } from '../services/api';
import { supabase } from '../services/supabase';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import PriceCard from '../components/PriceCard';
import PriceTable from '../components/PriceTable';
import ErrorCard from '../components/ErrorCard';

const getCommodityIcon = (name) => {
  switch (name) {
    case 'Potato': return '🥔';
    case 'Tomato': return '🍅';
    case 'Ladyfinger': return '🫛';
    default: return '🌾';
  }
};

const getCommodityTranslation = (name) => {
  switch (name) {
    case 'Potato': return 'Aloo';
    case 'Tomato': return 'Tamatar';
    case 'Ladyfinger': return 'Bhindi';
    default: return '';
  }
};

const getWeatherGradient = (condition) => {
  const cond = condition ? condition.toLowerCase() : '';
  if (cond.includes('clear') || cond.includes('sunny')) return ['#FFFDF4', '#FFFDF4', '#FFF4D0']; // bright warm sun
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy')) return ['#F0F9FF', '#E0F2FE', '#BAE6FD']; // fresh cool rain
  if (cond.includes('thunder') || cond.includes('storm')) return ['#F8FAFC', '#E2E8F0', '#CBD5E1']; // moody storm overcast
  return ['#FFFFFF', '#F8FAFC', '#F1F5F9']; // clean daylight
};

export default function HomeScreen() {
  // ── Tabs ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState('prices');

  // ── Mandi Prices state ────────────────────────
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [error, setError] = useState(null);

  // State, City, & Commodity selectors
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState('Potato');
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [commodityModalVisible, setCommodityModalVisible] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesList, setStatesList] = useState([]);
  const [stateSearch, setStateSearch] = useState('');
  const [citiesList, setCitiesList] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [allMandiRecords, setAllMandiRecords] = useState([]);

  // ── Weather state ─────────────────────────────
  const [city, setCity] = useState('Agra');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  // ── Storage Holdings & Farmer Lookup state ────
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [farmerData, setFarmerData] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [farmerError, setFarmerError] = useState(null);
  const [holdingsList, setHoldingsList] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState(null);
  const [dbFarmers, setDbFarmers] = useState([]);
  const [dbFarmersLoading, setDbFarmersLoading] = useState(false);
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
  const [myStockModalVisible, setMyStockModalVisible] = useState(false);
  
  // Registration form states
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState('');
  const [newFarmerId, setNewFarmerId] = useState('');
  const [newFarmerState, setNewFarmerState] = useState('Rajasthan');
  const [newFarmerCrop, setNewFarmerCrop] = useState('Potato');
  const [newFarmerPhone, setNewFarmerPhone] = useState('');
  const [newFarmerFatherName, setNewFarmerFatherName] = useState('');
  const [newFarmerVillage, setNewFarmerVillage] = useState('');
  const [newFarmerDistrict, setNewFarmerDistrict] = useState('');
  const [newFarmerTehsil, setNewFarmerTehsil] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // ── Cold Storage summary state ────────────────
  const [csSummary, setCsSummary] = useState(null);
  const [csLoading, setCsLoading] = useState(false);
  const [csError, setCsError] = useState(null);
  const [csWeather, setCsWeather] = useState(null);
  const [coldStoragesList, setColdStoragesList] = useState([]);
  const [selectedColdStorageId, setSelectedColdStorageId] = useState('cmmp9txv0000ai3t4wush9trs');
  const [csModalVisible, setCsModalVisible] = useState(false);
  const [coldStoragesLoading, setColdStoragesLoading] = useState(false);

  // Cold Storage registration form states
  const [csRegisterModalVisible, setCsRegisterModalVisible] = useState(false);
  const [newCsName, setNewCsName] = useState('');
  const [newCsCity, setNewCsCity] = useState('');
  const [newCsDistrict, setNewCsDistrict] = useState('');
  const [newCsState, setNewCsState] = useState('');
  const [newCsAddress, setNewCsAddress] = useState('');
  const [newCsContactPerson, setNewCsContactPerson] = useState('');
  const [newCsPhone, setNewCsPhone] = useState('');
  const [csRegisterLoading, setCsRegisterLoading] = useState(false);

  // Amad registration form states
  const [amadModalVisible, setAmadModalVisible] = useState(false);
  const [amadFarmerId, setAmadFarmerId] = useState('');
  const [amadCommodity, setAmadCommodity] = useState('Potato');
  const [amadKism, setAmadKism] = useState('Pukhraj');
  const [amadRoomId, setAmadRoomId] = useState('Room 1');
  const [amadRackId, setAmadRackId] = useState('Rack A');
  const [amadPackets, setAmadPackets] = useState('');
  const [amadWeightQtl, setAmadWeightQtl] = useState('');
  const [amadGoodsCondition, setAmadGoodsCondition] = useState('Fresh');
  const [amadSubmitLoading, setAmadSubmitLoading] = useState(false);

  // Inventory list modal states
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Load cities list automatically when state or commodity changes
  useEffect(() => {
    if (selectedState) {
      loadCitiesForState(selectedState, selectedCommodity);
    }
  }, [selectedState, selectedCommodity]);

  const loadCitiesForState = async (state, commodity) => {
    setCitiesLoading(true);
    try {
      const result = await fetchMandiPrices(state, commodity);
      const records = result.records || [];
      setAllMandiRecords(records);
      const uniqueCities = [...new Set(records.map(r => r.market))];
      setCitiesList(uniqueCities);
      if (uniqueCities.length > 0) {
        setSelectedCity(uniqueCities[0]);
      } else {
        setSelectedCity(null);
      }
    } catch (err) {
      console.warn("Failed to load cities:", err.message);
    } finally {
      setCitiesLoading(false);
    }
  };

  // Recalculate min/max prices reactively when selectedCity or allMandiRecords change
  useEffect(() => {
    if (allMandiRecords.length > 0) {
      const filtered = selectedCity
        ? allMandiRecords.filter(r => r.market === selectedCity)
        : allMandiRecords;

      if (filtered.length > 0) {
        const overallMin = Math.min(...filtered.map((p) => p.minPrice).filter((v) => v > 0));
        const overallMax = Math.max(...filtered.map((p) => p.maxPrice).filter((v) => v > 0));
        setMinPrice(overallMin);
        setMaxPrice(overallMax);
      } else {
        setMinPrice(null);
        setMaxPrice(null);
      }
    } else {
      setMinPrice(null);
      setMaxPrice(null);
    }
  }, [selectedCity, allMandiRecords]);

  // Load Cold Storage Summary automatically when entering the cold_storage tab
  useEffect(() => {
    if (activeTab === 'cold_storage') {
      loadColdStorageData(selectedColdStorageId);
      if (coldStoragesList.length === 0) {
        loadColdStoragesList();
      }
    }
  }, [activeTab, selectedColdStorageId]);

  const loadColdStoragesList = async () => {
    setColdStoragesLoading(true);
    try {
      const storages = await fetchColdStorages();
      setColdStoragesList(storages || []);
    } catch (err) {
      console.warn("Failed to load cold storages list:", err.message);
    } finally {
      setColdStoragesLoading(false);
    }
  };

  const loadColdStorageData = async (csId = selectedColdStorageId) => {
    setCsLoading(true);
    setCsError(null);
    try {
      const summary = await fetchColdStorageSummary(csId);
      setCsSummary(summary);

      // Fetch weather for cold storage location
      const cityToQuery = summary.coldStorage.district || summary.coldStorage.city || 'Firozabad';
      try {
        const weather = await fetchWeather(cityToQuery);
        setCsWeather(weather);
      } catch (weatherErr) {
        console.warn("Failed to load weather for Cold Storage location:", weatherErr.message);
      }
    } catch (err) {
      setCsError(err.message);
      setCsSummary(null);
    } finally {
      setCsLoading(false);
    }
  };

  // Load database farmers automatically when entering storage tab
  useEffect(() => {
    if (activeTab === 'storage' && dbFarmers.length === 0) {
      loadDbFarmers();
    }
  }, [activeTab]);

  const loadDbFarmers = async () => {
    setDbFarmersLoading(true);
    try {
      const farmers = await fetchFarmers();
      setDbFarmers(farmers || []);
      // Auto-select the first farmer if list is not empty
      if (farmers && farmers.length > 0) {
        handleSelectFarmer(farmers[0].serial_number);
      }
    } catch (err) {
      console.warn("Failed to load database farmers:", err.message);
    } finally {
      setDbFarmersLoading(false);
    }
  };

  const handleRegisterFarmer = async () => {
    if (!newFarmerName.trim()) {
      Alert.alert('Error', 'Farmer Name is required.');
      return;
    }
    if (!newFarmerId.trim()) {
      Alert.alert('Error', 'Farmer ID / Serial Number is required.');
      return;
    }
    setRegisterLoading(true);
    try {
      const farmerData = {
        serial_number: newFarmerId.trim(),
        name: newFarmerName.trim(),
        state: newFarmerState.trim(),
        commodity: newFarmerCrop.trim(),
        phone: newFarmerPhone.trim(),
        fatherName: newFarmerFatherName.trim(),
        village: newFarmerVillage.trim(),
        district: newFarmerDistrict.trim(),
        tehsil: newFarmerTehsil.trim(),
      };
      await addFarmer(farmerData);
      Alert.alert('Success', `Farmer "${newFarmerName}" registered successfully!`);
      // Reset form
      setNewFarmerName('');
      setNewFarmerId('');
      setNewFarmerState('Rajasthan');
      setNewFarmerCrop('Potato');
      setNewFarmerPhone('');
      setNewFarmerFatherName('');
      setNewFarmerVillage('');
      setNewFarmerDistrict('');
      setNewFarmerTehsil('');
      setRegisterModalVisible(false);
      // Reload list and select the new farmer
      await loadDbFarmers();
      setSelectedFarmerId(farmerData.serial_number);
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRegisterColdStorage = async () => {
    if (!newCsName.trim()) {
      Alert.alert('Error', 'Cold Storage Name is required.');
      return;
    }
    setCsRegisterLoading(true);
    try {
      const generatedId = 'cs_' + Math.random().toString(36).substring(2, 11);
      const csData = {
        id: generatedId,
        displayName: newCsName.trim(),
        city: newCsCity.trim() || 'Tundla',
        district: newCsDistrict.trim() || 'Firozabad',
        state: newCsState.trim() || 'Uttar Pradesh',
        address: newCsAddress.trim() || `${newCsCity.trim() || 'Tundla'}, ${newCsDistrict.trim() || 'Firozabad'}`,
        contactPerson: newCsContactPerson.trim() || 'Manager',
        phone: newCsPhone.trim() || '9999999999'
      };

      await addColdStorage(csData);
      Alert.alert('Success', `Cold Storage "${newCsName}" registered successfully!`);
      // Reset form
      setNewCsName('');
      setNewCsCity('');
      setNewCsDistrict('');
      setNewCsState('');
      setNewCsAddress('');
      setNewCsContactPerson('');
      setNewCsPhone('');
      setCsRegisterModalVisible(false);
      
      // Reload list and select it
      await loadColdStoragesList();
      setSelectedColdStorageId(generatedId);
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setCsRegisterLoading(false);
    }
  };

  const handleOpenAmadModal = async () => {
    let farmersList = dbFarmers;
    if (farmersList.length === 0) {
      setDbFarmersLoading(true);
      try {
        const farmers = await fetchFarmers();
        farmersList = farmers || [];
        setDbFarmers(farmersList);
      } catch (err) {
        console.warn("Failed to load farmers for Amad:", err.message);
      } finally {
        setDbFarmersLoading(false);
      }
    }
    
    setAmadFarmerId(farmersList.length > 0 ? farmersList[0].serial_number : '');
    setAmadCommodity('Potato');
    setAmadKism('Pukhraj');
    setAmadRoomId('Room 1');
    setAmadRackId('Rack A');
    setAmadPackets('');
    setAmadWeightQtl('');
    setAmadGoodsCondition('Fresh');
    setAmadModalVisible(true);
  };

  const handleRegisterAmad = async () => {
    if (!amadFarmerId) {
      Alert.alert('Error', 'Please select a farmer.');
      return;
    }
    if (!amadPackets || parseInt(amadPackets, 10) <= 0) {
      Alert.alert('Error', 'Please enter a valid packet count.');
      return;
    }
    if (!amadWeightQtl || parseFloat(amadWeightQtl) <= 0) {
      Alert.alert('Error', 'Please enter a valid weight.');
      return;
    }
    
    setAmadSubmitLoading(true);
    try {
      const amadData = {
        farmerId: amadFarmerId,
        coldStorageId: selectedColdStorageId || 'cmmp9txv0000ai3t4wush9trs',
        commodity: amadCommodity.trim(),
        kism: amadKism.trim(),
        roomId: amadRoomId.trim(),
        rackId: amadRackId.trim(),
        packets: parseInt(amadPackets, 10),
        weightQtl: parseFloat(amadWeightQtl),
        goodsCondition: amadGoodsCondition
      };
      
      await addAmad(amadData);
      Alert.alert('Success', 'Amad transaction recorded successfully!');
      setAmadModalVisible(false);
      
      // Refresh summary
      await loadColdStorageData(selectedColdStorageId);
    } catch (err) {
      Alert.alert('Failed to Add Amad', err.message);
    } finally {
      setAmadSubmitLoading(false);
    }
  };

  const handleOpenInventoryModal = async () => {
    setInventoryModalVisible(true);
    setInventoryLoading(true);
    try {
      const holdings = await fetchHoldings();
      const filtered = holdings.filter(h => h.coldStorageId === selectedColdStorageId);
      setInventoryList(filtered);
    } catch (err) {
      console.warn("Failed to load inventory:", err.message);
    } finally {
      setInventoryLoading(false);
    }
  };



  // Auto-fetch weather when entering weather tab for the first time
  useEffect(() => {
    if (activeTab === 'weather' && !weatherData && !weatherLoading) {
      handleFetchWeather('Agra');
    }
  }, [activeTab]);



  const handleSelectFarmer = async (id) => {
    setSelectedFarmerId(id);
    setFarmerLoading(true);
    setFarmerError(null);
    setHoldingsLoading(true);
    setHoldingsError(null);
    try {
      // Fetch specific farmer details
      const farmers = await fetchFarmers('', id);
      if (farmers && farmers.length > 0) {
        setFarmerData(farmers[0]);
      } else {
        setFarmerData(null);
        setFarmerError("Farmer details not found in registry.");
      }

      // Fetch holdings matching this ID
      const holdings = await fetchHoldings();
      const filtered = holdings.filter(h => h.id === id);
      setHoldingsList(filtered);
    } catch (err) {
      setFarmerError(err.message);
      setFarmerData(null);
      setHoldingsList([]);
    } finally {
      setFarmerLoading(false);
      setHoldingsLoading(false);
    }
  };

  // ── Mandi Prices handlers ─────────────────────
  const handleSelectState = async () => {
    setStateModalVisible(true);
    setStateSearch('');
    if (statesList.length === 0) {
      setStatesLoading(true);
      try {
        const states = await fetchStates();
        setStatesList(states);
      } catch (err) {
        setError(err.message);
        setStateModalVisible(false);
      } finally {
        setStatesLoading(false);
      }
    }
  };

  const handleStateSelect = (state) => {
    setSelectedState(state);
    setStateModalVisible(false);
    setSelectedCity(null);
    setCitiesList([]);
    setAllMandiRecords([]);
    setMinPrice(null);
    setMaxPrice(null);
    setError(null);
  };

  const handleFetch = async () => {
    if (!selectedState) {
      setError('Please select a state first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMandiPrices(selectedState, selectedCommodity);
      setAllMandiRecords(result.records || []);
    } catch (err) {
      setError(err.message);
      setAllMandiRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStates = statesList.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  // ── Weather handlers ──────────────────────────
  const handleFetchWeather = async (searchCity = city) => {
    if (!searchCity.trim()) {
      setWeatherError('Please enter a district or city name.');
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather(searchCity);
      setWeatherData(data);
    } catch (err) {
      setWeatherError(err.message);
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  // ── Weather helpers ───────────────────────────
  const getDayName = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  };

  const getWeatherEmoji = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '☁️';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy')) return '🌧️';
    if (cond.includes('thunder') || cond.includes('storm')) return '⛈️';
    if (cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard')) return '❄️';
    return '🌡️';
  };

  const getWeatherBg = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return '#FFFBEA';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#F0F9FF';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#F4F6F7';
    return COLORS.white;
  };

  const getWeatherBorderColor = (condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('clear') || cond.includes('sunny')) return COLORS.amber;
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#0EA5E9';
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#94A3B8';
    return COLORS.greenLight;
  };

  // Farmer Agricultural Advisory Logic
  const getAgriAdvisory = (humidity, windSpeed, condition) => {
    const cond = condition ? condition.toLowerCase() : '';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) {
      return "🌧️ Rain forecast: Suspend irrigation and secure harvested crops immediately.";
    }
    if (humidity > 80) {
      return "💧 High humidity: Increased risk of fungal pests. Keep a close watch on crops.";
    }
    if (windSpeed > 25) {
      return "💨 Strong winds: Postpone spraying chemical pesticides to avoid drift.";
    }
    return "✅ Good conditions: Ideal for weeding, fertilizer application, and spraying.";
  };

  // Filtered farmers list based on search query
  const filteredDbFarmers = dbFarmers.filter(f => 
    f.name.toLowerCase().includes(farmerSearchQuery.toLowerCase()) ||
    (f.state && f.state.toLowerCase().includes(farmerSearchQuery.toLowerCase()))
  );

  // ── Render ────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, (activeTab === 'cold_storage' || (activeTab === 'storage' && selectedFarmerId && farmerData)) && { backgroundColor: '#FFFFFF' }]}
    >
      <StatusBar barStyle={(activeTab === 'cold_storage' || (activeTab === 'storage' && selectedFarmerId && farmerData)) ? 'dark-content' : 'light-content'} backgroundColor={(activeTab === 'cold_storage' || (activeTab === 'storage' && selectedFarmerId && farmerData)) ? '#FFFFFF' : COLORS.greenDeep} />

      {(activeTab === 'cold_storage' || (activeTab === 'storage' && selectedFarmerId && farmerData)) ? (
        /* ── Clean White Header for Cold Storage / Farmer Dashboard ── */
        <View style={styles.csAppHeader}>
          <TouchableOpacity
            style={styles.csHamburgerBtn}
            onPress={() => {
              if (activeTab === 'storage' && selectedFarmerId) {
                setSelectedFarmerId(null);
                setFarmerData(null);
              } else {
                setActiveTab('prices');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.csHamburgerLine} />
            <View style={[styles.csHamburgerLine, { width: 14 }]} />
            <View style={styles.csHamburgerLine} />
          </TouchableOpacity>
          <Text style={styles.csAppHeaderTitle}>Annsetu</Text>
          <TouchableOpacity
            style={styles.csHeaderBellBtn}
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() }
              ])
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, color: '#D32F2F', fontWeight: 'bold' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Original Gradient Header ── */
        <LinearGradient
          colors={['#14332A', '#1E4032', '#2D6A4F']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.brandName}>Annsetu</Text>
            <Text style={styles.brandTagline}>Connecting Farmers with Markets</Text>
            <View style={styles.headerAccent} />
          </View>
        </LinearGradient>
      )}

      {/* Centered Capsule Tabs Navigation — hidden on cold_storage / farmer dashboard */}
      {activeTab !== 'cold_storage' && !(activeTab === 'storage' && selectedFarmerId && farmerData) && (
        <View style={styles.tabOuterContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'prices' && styles.tabButtonActive]}
              onPress={() => setActiveTab('prices')}
              activeOpacity={0.8}
            >
              {activeTab === 'prices' && (
                <LinearGradient
                  colors={[COLORS.greenDeep, COLORS.greenMid]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <Text style={[styles.tabText, activeTab === 'prices' && styles.tabTextActive]}>
                🌾 Prices
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'storage' && styles.tabButtonActive]}
              onPress={() => setActiveTab('storage')}
              activeOpacity={0.8}
            >
              {activeTab === 'storage' && (
                <LinearGradient
                  colors={[COLORS.greenDeep, COLORS.greenMid]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <Text style={[styles.tabText, activeTab === 'storage' && styles.tabTextActive]}>
                👨‍🌾 Farmers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'cold_storage' && styles.tabButtonActive]}
              onPress={() => setActiveTab('cold_storage')}
              activeOpacity={0.8}
            >
              {activeTab === 'cold_storage' && (
                <LinearGradient
                  colors={[COLORS.greenDeep, COLORS.greenMid]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <Text style={[styles.tabText, activeTab === 'cold_storage' && styles.tabTextActive]}>
                🏢 Storages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'weather' && styles.tabButtonActive]}
              onPress={() => setActiveTab('weather')}
              activeOpacity={0.8}
            >
              {activeTab === 'weather' && (
                <LinearGradient
                  colors={[COLORS.greenDeep, COLORS.greenMid]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <Text style={[styles.tabText, activeTab === 'weather' && styles.tabTextActive]}>
                ☀️ Weather
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'prices' ? (
          /* ════════════ MANDI PRICES TAB ════════════ */
          <View style={styles.tabContent}>
            <Text style={styles.title}>{selectedCommodity} Mandi Prices</Text>
            <Text style={styles.subtitle}>
              Live price ranges by state · per quintal
            </Text>

            {/* ─── Filter Selectors ─── */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>FILTERS</Text>

              {/* State Selector */}
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={handleSelectState}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconBadge}>
                  <Text style={{ fontSize: 16 }}>🗺️</Text>
                </View>
                <View style={styles.dropdownFieldInner}>
                  <Text style={styles.dropdownLabel}>State</Text>
                  <Text style={styles.dropdownValue} numberOfLines={1}>
                    {selectedState || 'Choose a state'}
                  </Text>
                </View>
                <Text style={styles.dropdownChevron}>›</Text>
              </TouchableOpacity>

              {/* City Selector */}
              <TouchableOpacity
                style={[styles.dropdownField, !selectedState && styles.dropdownFieldDisabled]}
                onPress={() => setCityModalVisible(true)}
                disabled={!selectedState || citiesLoading}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconBadge}>
                  <Text style={{ fontSize: 16 }}>📍</Text>
                </View>
                <View style={styles.dropdownFieldInner}>
                  <Text style={styles.dropdownLabel}>City / Market</Text>
                  {citiesLoading ? (
                    <ActivityIndicator size="small" color={COLORS.greenMid} style={{ alignSelf: 'flex-start' }} />
                  ) : (
                    <Text style={styles.dropdownValue} numberOfLines={1}>
                      {selectedCity || 'Select state first'}
                    </Text>
                  )}
                </View>
                <Text style={styles.dropdownChevron}>›</Text>
              </TouchableOpacity>

              {/* Commodity Selector */}
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => setCommodityModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconBadge}>
                  <Text style={{ fontSize: 16 }}>{getCommodityIcon(selectedCommodity)}</Text>
                </View>
                <View style={styles.dropdownFieldInner}>
                  <Text style={styles.dropdownLabel}>Commodity</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.dropdownValue}>{selectedCommodity}</Text>
                  </View>
                </View>
                <Text style={styles.dropdownChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* ─── Fetch Action ─── */}
            <TouchableOpacity
              style={[
                styles.fetchActionBtn,
                (loading || !selectedState) && styles.fetchActionBtnDisabled,
              ]}
              onPress={handleFetch}
              disabled={loading || !selectedState}
              activeOpacity={0.85}
            >
              {!loading && selectedState && (
                <LinearGradient
                  colors={[COLORS.greenDeep, COLORS.greenMid]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.fetchActionBtnText}>Fetching…</Text>
                </View>
              ) : (
                <Text style={styles.fetchActionBtnText}>🔍  Fetch Market Prices</Text>
              )}
            </TouchableOpacity>

            {/* ─── Empty State ─── */}
            {!selectedState && !minPrice ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>🏢</Text>
                <Text style={styles.emptyStateTitle}>Choose your filters</Text>
                <Text style={styles.emptyStateText}>
                  Select a state, city, and commodity above to see the latest wholesale market prices.
                </Text>
              </View>
            ) : null}

            {/* ─── Price Dashboard ─── */}
            {minPrice !== null && maxPrice !== null && (
              <View style={styles.priceDashboard}>
                <View style={styles.dashboardAccentBar} />
                <View style={styles.dashboardBody}>
                  <View style={styles.dashboardHeader}>
                    <View style={styles.cropIconContainer}>
                      <Text style={styles.dashboardIcon}>{getCommodityIcon(selectedCommodity)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dashboardTitle}>{selectedCommodity} ({getCommodityTranslation(selectedCommodity)})</Text>
                      <Text style={styles.dashboardLocation}>📍 {selectedCity ? `${selectedCity}, ` : ''}{selectedState}</Text>
                    </View>
                  </View>

                  <View style={styles.dashboardDivider} />

                  {/* Upgraded Side-by-Side count-up Price Cards */}
                  <View style={styles.priceCardsRow}>
                    <PriceCard label="Min Price" value={minPrice} variant="min" />
                    <View style={{ width: 12 }} />
                    <PriceCard label="Max Price" value={maxPrice} variant="max" />
                  </View>

                  {/* Visual Spread Slider Gauge */}
                  <View style={styles.spreadGaugeContainer}>
                    <View style={styles.spreadGaugeLabels}>
                      <Text style={styles.spreadGaugeMin}>₹{minPrice.toLocaleString('en-IN')}</Text>
                      <Text style={styles.spreadGaugeSpread}>Spread: ₹{(maxPrice - minPrice).toLocaleString('en-IN')}</Text>
                      <Text style={styles.spreadGaugeMax}>₹{maxPrice.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.spreadGaugeTrack}>
                      <LinearGradient
                        colors={[COLORS.greenLight, COLORS.amber, COLORS.errorRed]}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {error && (
              <ErrorCard message={error} onRetry={handleFetch} />
            )}
          </View>
        ) : activeTab === 'storage' ? (
          /* ════════════ FARMER DASHBOARD (Figma Design) ════════════ */
          <View style={styles.tabContent}>
            {dbFarmersLoading ? (
              <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
            ) : !selectedFarmerId && dbFarmers.length > 0 ? (
              /* ── Farmer Selector (first-time) ── */
              <View style={{ width: '100%' }}>
                <Text style={styles.csSectionTitle}>Select a Farmer</Text>
                <Text style={[styles.subtitle, { marginBottom: 16 }]}>Choose a farmer profile to view their dashboard</Text>
                
                {/* Search Bar & Register */}
                <View style={[styles.searchContainer, { marginBottom: 16 }]}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search farmers..."
                    placeholderTextColor={COLORS.textLight}
                    value={farmerSearchQuery}
                    onChangeText={setFarmerSearchQuery}
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.searchButton, { backgroundColor: COLORS.greenDeep }]}
                    onPress={() => {
                      const randomId = 'f_' + Math.random().toString(36).substring(2, 11);
                      setNewFarmerId(randomId);
                      setNewFarmerName('');
                      setNewFarmerState('Rajasthan');
                      setNewFarmerCrop('Potato');
                      setNewFarmerPhone('');
                      setNewFarmerFatherName('');
                      setNewFarmerVillage('');
                      setNewFarmerDistrict('');
                      setNewFarmerTehsil('');
                      setRegisterModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.searchButtonText}>➕ Register</Text>
                  </TouchableOpacity>
                </View>

                {filteredDbFarmers.map((f) => (
                  <TouchableOpacity
                    key={f.serial_number}
                    style={styles.farmerListCard}
                    onPress={() => handleSelectFarmer(f.serial_number)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.farmerListAvatar}>
                      <Text style={{ fontSize: 22 }}>👨‍🌾</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.farmerListName}>{f.name}</Text>
                      <Text style={styles.farmerListMeta}>
                        {f.village ? `${f.village}, ` : ''}{f.district || f.state || 'Rajasthan'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: '#C4B99A' }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : selectedFarmerId && (farmerLoading || holdingsLoading) ? (
              <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
            ) : selectedFarmerId && (farmerError || holdingsError) ? (
              <ErrorCard message={farmerError || holdingsError} onRetry={() => handleSelectFarmer(selectedFarmerId)} />
            ) : selectedFarmerId && farmerData ? (
              /* ── Farmer Dashboard (Figma layout) ── */
              <View style={{ width: '100%' }}>
                {/* Green Header Banner */}
                <View style={styles.csDashboardHeader}>
                  <LinearGradient
                    colors={['#1B4332', '#2D6A4F']}
                    style={styles.csHeaderGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.csHeaderTopRow}>
                      <View style={{ flex: 1 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedFarmerId(null);
                            setFarmerData(null);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.csHeaderTitle}>{farmerData.name}</Text>
                        </TouchableOpacity>
                        <Text style={styles.csHeaderLocation}>
                          ◎ {farmerData.village ? `${farmerData.village}, ` : ''}{farmerData.district || ''}{farmerData.state ? `, ${farmerData.state}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.csBellBtn}
                        onPress={() => Alert.alert('Notifications', 'No new alerts for this farmer.')}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                        <View style={styles.csBellDot} />
                      </TouchableOpacity>
                    </View>

                    {/* Summary Cards Row */}
                    <View style={styles.csSummaryRow}>
                      <View style={styles.csSummaryCard}>
                        <Text style={styles.csSummaryCardLabel}>Total Stock</Text>
                        <Text style={styles.csSummaryCardValue}>
                          {holdingsList.length > 0 
                            ? `${holdingsList.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0).toFixed(1)} MT`
                            : '0.0 MT'
                          }
                        </Text>
                        <Text style={styles.csSummaryCardSub}>
                          {holdingsList.length > 0 
                            ? `${holdingsList.reduce((sum, h) => sum + (h.bags || 0), 0)} bags`
                            : '0 bags'
                          }
                        </Text>
                      </View>
                      <View style={styles.csSummaryCard}>
                        <Text style={styles.csSummaryCardLabel}>Pending Rent</Text>
                        <Text style={[styles.csSummaryCardValue, { color: '#E53E3E' }]}>
                          ₹{farmerData.pendingRent ? parseFloat(farmerData.pendingRent).toLocaleString('en-IN') : '0'}
                        </Text>
                        <Text style={styles.csSummaryCardSub}>
                          {parseFloat(farmerData.pendingRent || 0) > 0 ? 'Overdue' : 'No dues'}
                        </Text>
                      </View>
                      <View style={styles.csSummaryCard}>
                        <Text style={styles.csSummaryCardLabel}>Aging Alerts</Text>
                        <Text style={[styles.csSummaryCardValue, { color: '#FFA726' }]}>
                          {holdingsList.filter(h => (h.age_days || 0) > 30).length}
                        </Text>
                        <Text style={styles.csSummaryCardSub}>
                          Action needed
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Quick Actions Section */}
                <Text style={styles.csSectionTitle}>Quick Actions</Text>
                <View style={styles.csGridContainer}>
                  {[
                    { label: 'My Stock', icon: '📦', bg: '#E8F5E9', color: '#2E7D32' },
                    { label: 'Mandi Rates', icon: '📈', bg: '#E3F2FD', color: '#1565C0' },
                    { label: 'My Khata', icon: '📒', bg: '#FFF3E0', color: '#E65100' },
                    { label: 'Dispatch', icon: '🚚', bg: '#F3E5F5', color: '#4A148C' },
                    { label: 'Weather', icon: '☁️', bg: '#E0F7FA', color: '#006064' },
                    { label: 'Book Space', icon: '➕', bg: '#FCE4EC', color: '#C62828' }
                  ].map((action, idx) => (
                    <TouchableOpacity
                      key={action.label + idx}
                      style={styles.csGridItem}
                      onPress={() => {
                        if (action.label === 'My Stock') setMyStockModalVisible(true);
                        else if (action.label === 'Mandi Rates') setActiveTab('prices');
                        else if (action.label === 'Weather') setActiveTab('weather');
                        else Alert.alert(action.label, `${action.label} feature coming soon.`);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.csGridIconContainer, { backgroundColor: action.bg }]}>
                        <Text style={{ fontSize: 24, color: action.color }}>{action.icon}</Text>
                      </View>
                      <Text style={styles.csGridLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Live Mandi Prices Section */}
                <View style={styles.csSectionHeaderRow}>
                  <Text style={styles.csSectionTitle}>Live Mandi Prices / आज के भाव</Text>
                  <TouchableOpacity onPress={() => setActiveTab('prices')}>
                    <Text style={styles.csViewAllText}>View All ›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.csPricesList}>
                  {[
                    { commodity: 'Potato (Pukhraj)', location: 'Agra', price: '₹820', trend: '↗ 15', trendColor: '#2E7D32' },
                    { commodity: 'Potato (Chipsona)', location: 'Firozabad', price: '₹950', trend: '↘ 20', trendColor: '#C62828' },
                    { commodity: 'Onion', location: 'Tundla', price: '₹1100', trend: '↗ 45', trendColor: '#2E7D32' }
                  ].map((item, idx) => (
                    <View key={item.commodity + idx} style={styles.csPriceItem}>
                      <View>
                        <Text style={styles.csPriceName}>{item.commodity}</Text>
                        <Text style={styles.csPriceLoc}>{item.location}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.csPriceVal}>{item.price}</Text>
                        <Text style={[styles.csPriceTrend, { color: item.trendColor }]}>{item.trend}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Recent Activity Section */}
                <View style={styles.csSectionHeaderRow}>
                  <Text style={styles.csSectionTitle}>Recent Activity</Text>
                  <TouchableOpacity onPress={() => setMyStockModalVisible(true)}>
                    <Text style={styles.csViewAllText}>View All ›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.csActivityList}>
                  {holdingsList.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyStateIcon}>📋</Text>
                      <Text style={styles.emptyStateTitle}>No Recent Entries</Text>
                      <Text style={styles.emptyStateText}>No storage activity recorded for this farmer.</Text>
                    </View>
                  ) : (
                    holdingsList.slice(0, 3).map((h, idx) => {
                      const isFresh = (h.status || '').toLowerCase() === 'fresh';
                      const badgeBg = isFresh ? '#E8F5E9' : '#E3F2FD';
                      const badgeText = isFresh ? '#2E7D32' : '#1565C0';
                      
                      return (
                        <View key={(h.id || idx) + idx} style={styles.csActivityCard}>
                          <View style={styles.csActivityHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.csActivityTitle}>
                                {h.crop} — {h.variety}
                              </Text>
                              <Text style={styles.csActivitySubtitle}>
                                {h.cold_storage} · {h.location}
                              </Text>
                            </View>
                            <View style={[styles.csActivityBadge, { backgroundColor: badgeBg }]}>
                              <Text style={[styles.csActivityBadgeText, { color: badgeText }]}>
                                {h.status}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.csActivityMetaGrid}>
                            <View style={styles.csActivityMetaItem}>
                              <Text style={styles.csActivityMetaLabel}>Bags</Text>
                              <Text style={styles.csActivityMetaValue}>{h.bags}</Text>
                            </View>
                            <View style={styles.csActivityMetaDivider} />
                            <View style={styles.csActivityMetaItem}>
                              <Text style={styles.csActivityMetaLabel}>Weight</Text>
                              <Text style={styles.csActivityMetaValue}>{h.weight}</Text>
                            </View>
                            <View style={styles.csActivityMetaDivider} />
                            <View style={styles.csActivityMetaItem}>
                              <Text style={styles.csActivityMetaLabel}>Age</Text>
                              <Text style={styles.csActivityMetaValue}>{h.age_days}d</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            ) : (
              /* ── No farmers loaded ── */
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>👨‍🌾</Text>
                <Text style={styles.emptyStateTitle}>No Farmers Found</Text>
                <Text style={styles.emptyStateText}>
                  No farmer records available. Register a new farmer to get started.
                </Text>
                <TouchableOpacity
                  style={[styles.fetchActionBtn, { marginTop: 16, width: '60%' }]}
                  onPress={() => {
                    const randomId = 'f_' + Math.random().toString(36).substring(2, 11);
                    setNewFarmerId(randomId);
                    setRegisterModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.greenDeep, COLORS.greenMid]}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={styles.fetchActionBtnText}>➕ Register Farmer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : activeTab === 'cold_storage' ? (
          /* ════════════ COLD STORAGE MANAGER DASHBOARD ════════════ */
          <View style={styles.tabContent}>
            {csLoading ? (
              <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
            ) : csError ? (
              <ErrorCard message={csError} onRetry={loadColdStorageData} />
            ) : csSummary ? (
              <View style={{ width: '100%' }}>
                {/* Green Header Area */}
                <View style={styles.csDashboardHeader}>
                  <LinearGradient
                    colors={['#1B4332', '#2D6A4F']}
                    style={styles.csHeaderGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.csHeaderTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.csHeaderSubtitle}>Cold Storage Manager</Text>
                        <TouchableOpacity
                          onPress={() => setCsModalVisible(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.csHeaderTitle}>{csSummary.coldStorage.name}</Text>
                        </TouchableOpacity>
                        <Text style={styles.csHeaderLocation}>◎ {csSummary.coldStorage.location}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.csBellBtn}
                        onPress={() => setCsModalVisible(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                        <View style={styles.csBellDot} />
                      </TouchableOpacity>
                    </View>

                    {/* Summary Cards Row */}
                    <View style={styles.csSummaryRow}>
                      <View style={styles.csSummaryCard}>
                        <Text style={styles.csSummaryCardLabel}>Capacity</Text>
                        <Text style={styles.csSummaryCardValue}>
                          {`${((csSummary.coldStorage.capacityQtl || 5000) * 0.1).toFixed(1)} MT`}
                        </Text>
                        <Text style={styles.csSummaryCardSub}>
                          {`${csSummary.coldStorage.roomCount || 10} rooms`}
                        </Text>
                      </View>
                      <View style={styles.csSummaryCard}>
                        <Text style={styles.csSummaryCardLabel}>Pending Dues</Text>
                        <Text style={[styles.csSummaryCardValue, { color: csSummary.dues.amount > 0 ? '#E53E3E' : '#FFFFFF' }]}>
                          {`₹${csSummary.dues.amount.toLocaleString('en-IN')}`}
                        </Text>
                        <Text style={styles.csSummaryCardSub}>
                          {`${csSummary.dues.farmersCount} farmers`}
                        </Text>
                      </View>
                      <View style={styles.csSummaryCard}>
                        <Text style={styles.csSummaryCardLabel}>Today Amad</Text>
                        <Text style={styles.csSummaryCardValue}>
                          {csSummary.todayAmad.entries}
                        </Text>
                        <Text style={styles.csSummaryCardSub}>
                          entries
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Quick Actions Section */}
                <Text style={styles.csSectionTitle}>Quick Actions</Text>
                <View style={styles.csGridContainer}>
                  {[
                    { label: 'Amad', icon: '↙', bg: '#E8F5E9', color: '#2E7D32' },
                    { label: 'Nikasi', icon: '🚚', bg: '#E3F2FD', color: '#1565C0' },
                    { label: 'Inventory', icon: '📦', bg: '#FFF3E0', color: '#E65100' },
                    { label: 'Billing', icon: '📄', bg: '#F3E5F5', color: '#4A148C' },
                    { label: 'Reports', icon: '📊', bg: '#E0F7FA', color: '#006064' },
                    { label: 'Settings', icon: '⚙️', bg: '#FFEBEE', color: '#C62828' }
                  ].map((action, idx) => (
                    <TouchableOpacity
                      key={action.label + idx}
                      style={styles.csGridItem}
                      onPress={() => {
                        if (action.label === 'Amad') {
                          handleOpenAmadModal();
                        } else if (action.label === 'Inventory') {
                          handleOpenInventoryModal();
                        } else {
                          Alert.alert('Quick Action', `${action.label} registry is loading...`);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.csGridIconContainer, { backgroundColor: action.bg }]}>
                        <Text style={{ fontSize: 24, color: action.color }}>{action.icon}</Text>
                      </View>
                      <Text style={styles.csGridLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Live Mandi Prices Section */}
                <View style={styles.csSectionHeaderRow}>
                  <Text style={styles.csSectionTitle}>Live Mandi Prices / आज के भाव</Text>
                  <TouchableOpacity onPress={() => setActiveTab('prices')}>
                    <Text style={styles.csViewAllText}>View All ›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.csPricesList}>
                  {[
                    { commodity: 'Potato (Pukhraj)', location: 'Agra', price: '₹820', trend: '↗ 15', trendColor: '#2E7D32' },
                    { commodity: 'Potato (Chipsona)', location: 'Firozabad', price: '₹950', trend: '↘ 20', trendColor: '#C62828' },
                    { commodity: 'Onion', location: 'Tundla', price: '₹1100', trend: '↗ 45', trendColor: '#2E7D32' }
                  ].map((item, idx) => (
                    <View key={item.commodity + idx} style={styles.csPriceItem}>
                      <View>
                        <Text style={styles.csPriceName}>{item.commodity}</Text>
                        <Text style={styles.csPriceLoc}>{item.location}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.csPriceVal}>{item.price}</Text>
                        <Text style={[styles.csPriceTrend, { color: item.trendColor }]}>{item.trend}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Recent Activity Section */}
                <View style={styles.csSectionHeaderRow}>
                  <Text style={styles.csSectionTitle}>Recent Activity</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Recent Activity', 'Displaying full logs...')}>
                    <Text style={styles.csViewAllText}>View All ›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.csActivityList}>
                  {csSummary.recentActivity.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyStateIcon}>📋</Text>
                      <Text style={styles.emptyStateTitle}>No Recent Entries</Text>
                      <Text style={styles.emptyStateText}>No recent Amad transactions have been registered.</Text>
                    </View>
                  ) : (
                    csSummary.recentActivity.map((activity, idx) => {
                      const isFresh = activity.status.toLowerCase() === 'fresh';
                      const badgeBg = isFresh ? '#E8F5E9' : '#E3F2FD';
                      const badgeText = isFresh ? '#2E7D32' : '#1565C0';
                      
                      return (
                        <View key={activity.id + idx} style={styles.csActivityCard}>
                          <View style={styles.csActivityHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.csActivityTitle}>
                                {activity.commodity} — {activity.variety}
                              </Text>
                              <Text style={styles.csActivitySubtitle}>
                                Room {activity.room} / {activity.rack} · {csSummary.coldStorage.name}
                              </Text>
                            </View>
                            <View style={[styles.csActivityBadge, { backgroundColor: badgeBg }]}>
                              <Text style={[styles.csActivityBadgeText, { color: badgeText }]}>
                                {activity.status}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.csActivityMetaGrid}>
                            <View style={styles.csActivityMetaItem}>
                              <Text style={styles.csActivityMetaLabel}>Bags</Text>
                              <Text style={styles.csActivityMetaValue}>{activity.bags}</Text>
                            </View>
                            <View style={styles.csActivityMetaDivider} />
                            <View style={styles.csActivityMetaItem}>
                              <Text style={styles.csActivityMetaLabel}>Weight</Text>
                              <Text style={styles.csActivityMetaValue}>
                                {activity.weightMt === 0 ? '15 MT' : `${activity.weightMt.toFixed(1)} MT`}
                              </Text>
                            </View>
                            <View style={styles.csActivityMetaDivider} />
                            <View style={styles.csActivityMetaItem}>
                              <Text style={styles.csActivityMetaLabel}>Age</Text>
                              <Text style={styles.csActivityMetaValue}>
                                {activity.ageDays === 0 ? '7d' : `${activity.ageDays}d`}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Weather Banner Section */}
                {csWeather && (
                  <View style={styles.csWeatherCard}>
                    <LinearGradient
                      colors={['#0078FF', '#00C6FF']}
                      style={styles.csWeatherGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.csWeatherLeft}>
                        <Text style={styles.csWeatherIcon}>{getWeatherEmoji(csWeather.mainCondition)}</Text>
                        <View style={{ marginLeft: 12 }}>
                          <Text style={styles.csWeatherCity}>{csWeather.location}</Text>
                          <Text style={styles.csWeatherDesc}>{csWeather.description} · Good for transport</Text>
                        </View>
                      </View>
                      <View style={styles.csWeatherRight}>
                        <Text style={styles.csWeatherTemp}>{csWeather.temp}°C</Text>
                        <Text style={styles.csWeatherRange}>
                          Max {csWeather.forecast[0]?.maxTemp || 35}° / Min {csWeather.forecast[0]?.minTemp || 24}°
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>🏢</Text>
                <Text style={styles.emptyStateTitle}>No Dashboard Data</Text>
                <Text style={styles.emptyStateText}>Could not load cold storage summary info.</Text>
              </View>
            )}
          </View>
        ) : (
          /* ════════════ WEATHER TAB ════════════ */
          <View style={styles.tabContent}>
            <Text style={styles.title}>Weather Information</Text>
            <Text style={styles.subtitle}>Agrarian forecast & planning assistant</Text>

            {/* Search Row */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter district/city (e.g. Agra)"
                placeholderTextColor={COLORS.textLight}
                value={city}
                onChangeText={setCity}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.searchButton, weatherLoading && styles.fetchActionBtnDisabled]}
                onPress={() => handleFetchWeather()}
                disabled={weatherLoading}
                activeOpacity={0.85}
              >
                {weatherLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>

            {weatherError && (
              <ErrorCard message={weatherError} onRetry={() => handleFetchWeather()} />
            )}

            {weatherData && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                {/* Current Weather Card */}
                <View style={[styles.weatherCardOuter, { borderColor: getWeatherBorderColor(weatherData.mainCondition) }]}>
                  <LinearGradient
                    colors={getWeatherGradient(weatherData.mainCondition)}
                    style={styles.weatherCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.weatherCardHeader}>
                      <Text style={styles.weatherLocation}>📍 {weatherData.location}</Text>
                      <View style={styles.weatherConditionBadge}>
                        <Text style={styles.weatherConditionBadgeText}>{weatherData.mainCondition}</Text>
                      </View>
                    </View>

                    <View style={styles.tempRow}>
                      <Text style={styles.weatherEmoji}>
                        {getWeatherEmoji(weatherData.mainCondition)}
                      </Text>
                      <Text style={styles.weatherTemp}>{weatherData.temp}°C</Text>
                    </View>
                    <Text style={styles.weatherDesc}>{weatherData.description}</Text>

                    <View style={styles.weatherDetails}>
                      <View style={styles.weatherDetailItem}>
                        <Text style={styles.weatherDetailLabel}>HUMIDITY</Text>
                        <Text style={styles.weatherDetailValue}>💧 {weatherData.humidity}%</Text>
                      </View>
                      <View style={styles.weatherDetailDivider} />
                      <View style={styles.weatherDetailItem}>
                        <Text style={styles.weatherDetailLabel}>WIND SPEED</Text>
                        <Text style={styles.weatherDetailValue}>💨 {weatherData.windSpeed} km/h</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* 5-Day Forecast */}
                {weatherData.forecast && weatherData.forecast.length > 0 && (
                  <View style={styles.forecastContainer}>
                    <Text style={styles.forecastTitle}>5-Day Weather Forecast</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.forecastScroll}
                    >
                      {weatherData.forecast.map((dayItem, idx) => (
                        <View
                          key={dayItem.date + idx}
                          style={[
                            styles.forecastCard,
                            {
                              backgroundColor: getWeatherBg(dayItem.conditionText),
                              borderColor: getWeatherBorderColor(dayItem.conditionText)
                            }
                          ]}
                        >
                          <Text style={styles.forecastDayName}>{getDayName(dayItem.date)}</Text>
                          <Text style={styles.forecastEmoji}>
                            {getWeatherEmoji(dayItem.conditionText)}
                          </Text>
                          <Text style={styles.forecastTempMax}>{dayItem.maxTemp}°C</Text>
                          <Text style={styles.forecastTempMin}>{dayItem.minTemp}°C</Text>
                          <Text style={styles.forecastCondition} numberOfLines={1}>
                            {dayItem.conditionText}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {activeTab === 'prices' ? 'Data directly from data.gov.in' : activeTab === 'storage' ? 'Data directly from PostgreSQL database' : 'Data directly from WeatherAPI.com'}
        </Text>
      </View>

      {/* ════════════ STATE SELECTION MODAL ════════════ */}
      <Modal
        visible={stateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setStateModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Search */}
            <View style={styles.modalSearchContainer}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search states…"
                placeholderTextColor="#7A7A7A"
                value={stateSearch}
                onChangeText={setStateSearch}
                autoCorrect={false}
              />
            </View>

            {/* States List */}
            {statesLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.greenDeep} />
                <Text style={styles.loadingText}>Loading states…</Text>
              </View>
            ) : (
              <FlatList
                data={filteredStates}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No states found matching "{stateSearch}"
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.stateItem,
                      selectedState === item && styles.stateItemSelected,
                    ]}
                    onPress={() => handleStateSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {selectedState === item && (
                        <View style={styles.activeStripe} />
                      )}
                      <Text
                        style={[
                          styles.stateItemText,
                          selectedState === item && styles.stateItemTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                    {selectedState === item && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ════════════ COMMODITY SELECTION MODAL ════════════ */}
      <Modal
        visible={commodityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommodityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Commodity</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCommodityModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Commodities List */}
            <View style={{ paddingVertical: 8 }}>
              {[
                { name: 'Potato', icon: '🥔', translation: 'Aloo' },
                { name: 'Tomato', icon: '🍅', translation: 'Tamatar' },
                { name: 'Ladyfinger', icon: '🫛', translation: 'Bhindi' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.stateItem,
                    selectedCommodity === item.name && styles.stateItemSelected,
                    { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
                  ]}
                  onPress={() => {
                    setSelectedCommodity(item.name);
                    setCommodityModalVisible(false);
                    setMinPrice(null);
                    setMaxPrice(null);
                    setError(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {selectedCommodity === item.name && (
                        <View style={styles.activeStripe} />
                      )}
                      <View>
                        <Text
                          style={[
                            styles.stateItemText,
                            selectedCommodity === item.name && styles.stateItemTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.textLight, fontWeight: '500', marginTop: 2 }}>
                          {item.translation}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {selectedCommodity === item.name && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════ CITY SELECTION MODAL ════════════ */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City / Market</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCityModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Cities List */}
            {citiesLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.greenDeep} />
                <Text style={styles.loadingText}>Loading markets…</Text>
              </View>
            ) : (
              <FlatList
                data={citiesList}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No markets found for this state.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.stateItem,
                      selectedCity === item && styles.stateItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedCity(item);
                      setCityModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {selectedCity === item && (
                        <View style={styles.activeStripe} />
                      )}
                      <Text
                        style={[
                          styles.stateItemText,
                          selectedCity === item && styles.stateItemTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                    {selectedCity === item && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ════════════ FARMER REGISTRATION MODAL ════════════ */}
      <Modal
        visible={registerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRegisterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Farmer</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setRegisterModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
              {/* Name Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Farmer Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter name (e.g. Dinesh Kumar)"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerName}
                  onChangeText={setNewFarmerName}
                />
              </View>

              {/* ID Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Farmer ID / Serial Number *</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    placeholder="Enter unique ID"
                    placeholderTextColor={COLORS.textLight}
                    value={newFarmerId}
                    onChangeText={setNewFarmerId}
                  />
                  <TouchableOpacity
                    style={[styles.outlinedActionBtn, { marginTop: 0, paddingVertical: 12, justifyContent: 'center' }]}
                    onPress={() => {
                      const randomId = 'f_' + Math.random().toString(36).substring(2, 11);
                      setNewFarmerId(randomId);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.outlinedActionBtnText}>🔄 Gen</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* State Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>State *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter State"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerState}
                  onChangeText={setNewFarmerState}
                />
              </View>

              {/* Crop Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Primary Crop *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Primary Crop"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerCrop}
                  onChangeText={setNewFarmerCrop}
                />
              </View>

              {/* Father's Name Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Father's Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter father's name"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerFatherName}
                  onChangeText={setNewFarmerFatherName}
                />
              </View>

              {/* Phone Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter phone number"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerPhone}
                  onChangeText={setNewFarmerPhone}
                  keyboardType="numeric"
                />
              </View>

              {/* Village Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Village</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter village"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerVillage}
                  onChangeText={setNewFarmerVillage}
                />
              </View>

              {/* Tehsil Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tehsil</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter tehsil"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerTehsil}
                  onChangeText={setNewFarmerTehsil}
                />
              </View>

              {/* District Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>District</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter district"
                  placeholderTextColor={COLORS.textLight}
                  value={newFarmerDistrict}
                  onChangeText={setNewFarmerDistrict}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.fetchActionBtn, registerLoading && styles.fetchActionBtnDisabled, { marginTop: 8, marginBottom: 30 }]}
                onPress={handleRegisterFarmer}
                disabled={registerLoading}
                activeOpacity={0.85}
              >
                {!registerLoading && (
                  <LinearGradient
                    colors={[COLORS.greenDeep, COLORS.greenMid]}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                {registerLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.fetchActionBtnText}>Register Farmer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════ COLD STORAGE SELECTION MODAL ════════════ */}
      <Modal
        visible={csModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Cold Storage</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCsModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Cold Storages List */}
            {coldStoragesLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.greenDeep} />
                <Text style={styles.loadingText}>Loading facilities…</Text>
              </View>
            ) : (
              <FlatList
                data={coldStoragesList}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[styles.stateItem, { backgroundColor: '#EAD9B0', justifyContent: 'center', paddingVertical: 14 }]}
                    onPress={() => {
                      setCsModalVisible(false);
                      setNewCsName('');
                      setNewCsCity('Tundla');
                      setNewCsDistrict('Firozabad');
                      setNewCsState('Uttar Pradesh');
                      setNewCsAddress('');
                      setNewCsContactPerson('');
                      setNewCsPhone('');
                      setCsRegisterModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontWeight: '700', color: COLORS.greenDeep }}>
                      ➕ Register New Storage
                    </Text>
                  </TouchableOpacity>
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No cold storages found in database.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.stateItem,
                      selectedColdStorageId === item.id && styles.stateItemSelected,
                      { paddingVertical: 16 }
                    ]}
                    onPress={() => {
                      setSelectedColdStorageId(item.id);
                      setCsModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {selectedColdStorageId === item.id && (
                        <View style={styles.activeStripe} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.stateItemText,
                            selectedColdStorageId === item.id && styles.stateItemTextSelected,
                            { fontWeight: '700' }
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>
                          📍 {item.city}, {item.district}, {item.state}
                        </Text>
                      </View>
                    </View>
                    {selectedColdStorageId === item.id && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ════════════ COLD STORAGE REGISTRATION MODAL ════════════ */}
      <Modal
        visible={csRegisterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCsRegisterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Cold Storage</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCsRegisterModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
              {/* Name Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Storage Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter storage name (e.g. Balaji CS)"
                  placeholderTextColor={COLORS.textLight}
                  value={newCsName}
                  onChangeText={setNewCsName}
                />
              </View>

              {/* City Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>City *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter City"
                  placeholderTextColor={COLORS.textLight}
                  value={newCsCity}
                  onChangeText={setNewCsCity}
                />
              </View>

              {/* District Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>District *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter District"
                  placeholderTextColor={COLORS.textLight}
                  value={newCsDistrict}
                  onChangeText={setNewCsDistrict}
                />
              </View>

              {/* State Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>State *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter State"
                  placeholderTextColor={COLORS.textLight}
                  value={newCsState}
                  onChangeText={setNewCsState}
                />
              </View>

              {/* Address Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Address</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter full address"
                  placeholderTextColor={COLORS.textLight}
                  value={newCsAddress}
                  onChangeText={setNewCsAddress}
                />
              </View>

              {/* Contact Person Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Person</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter contact person"
                  placeholderTextColor={COLORS.textLight}
                  value={newCsContactPerson}
                  onChangeText={setNewCsContactPerson}
                />
              </View>

              {/* Phone Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter phone number"
                  placeholderTextColor={COLORS.textLight}
                  value={newCsPhone}
                  onChangeText={setNewCsPhone}
                  keyboardType="numeric"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.fetchActionBtn, csRegisterLoading && styles.fetchActionBtnDisabled, { marginTop: 8, marginBottom: 30 }]}
                onPress={handleRegisterColdStorage}
                disabled={csRegisterLoading}
                activeOpacity={0.85}
              >
                {!csRegisterLoading && (
                  <LinearGradient
                    colors={[COLORS.greenDeep, COLORS.greenMid]}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                {csRegisterLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.fetchActionBtnText}>Register Storage</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════ AMAD REGISTRATION MODAL ════════════ */}
      <Modal
        visible={amadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAmadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Amad Lot Entry</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAmadModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
              {/* Farmer Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Farmer *</Text>
                {dbFarmers.length === 0 ? (
                  <View style={{ padding: 12, borderWidth: 1, borderColor: COLORS.errorRed, borderRadius: RADIUS.md }}>
                    <Text style={{ color: COLORS.errorRed, fontSize: 14 }}>No registered farmers found. Please register a farmer first in the Farmer tab.</Text>
                  </View>
                ) : (
                  <ScrollView 
                    nestedScrollEnabled={true} 
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 120, borderWidth: 1, borderColor: '#DDD', borderRadius: RADIUS.md, padding: 4 }}
                  >
                    {dbFarmers.map(f => (
                      <TouchableOpacity
                        key={f.serial_number}
                        onPress={() => setAmadFarmerId(f.serial_number)}
                        style={{
                          padding: 10,
                          backgroundColor: amadFarmerId === f.serial_number ? '#E8F5E9' : '#FFF',
                          borderBottomWidth: 1,
                          borderBottomColor: '#EEE',
                          borderRadius: RADIUS.xs,
                          flexDirection: 'row',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Text style={{ fontWeight: amadFarmerId === f.serial_number ? 'bold' : 'normal', color: amadFarmerId === f.serial_number ? '#2E7D32' : '#333' }}>
                          {f.name} ({f.serial_number})
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666' }}>{f.village || 'No village'}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Crop Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Crop / Commodity *</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['Potato', 'Tomato', 'Ladyfinger'].map(crop => (
                    <TouchableOpacity
                      key={crop}
                      onPress={() => setAmadCommodity(crop)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: RADIUS.sm,
                        borderWidth: 1,
                        borderColor: amadCommodity === crop ? '#2E7D32' : '#CCC',
                        backgroundColor: amadCommodity === crop ? '#E8F5E9' : '#FFF',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontWeight: '600', color: amadCommodity === crop ? '#2E7D32' : '#555' }}>
                        {getCommodityIcon(crop)} {crop}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Variety (Kism) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Variety (Kism) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter crop variety (e.g. Pukhraj)"
                  placeholderTextColor={COLORS.textLight}
                  value={amadKism}
                  onChangeText={setAmadKism}
                />
              </View>

              {/* Location (Room & Rack) */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.formLabel}>Room ID</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Room 1"
                    placeholderTextColor={COLORS.textLight}
                    value={amadRoomId}
                    onChangeText={setAmadRoomId}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.formLabel}>Rack ID</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Rack A"
                    placeholderTextColor={COLORS.textLight}
                    value={amadRackId}
                    onChangeText={setAmadRackId}
                  />
                </View>
              </View>

              {/* Packets & Weight */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.formLabel}>Bags (Packets) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 150"
                    placeholderTextColor={COLORS.textLight}
                    value={amadPackets}
                    onChangeText={setAmadPackets}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.formLabel}>Weight (Quintals) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 75"
                    placeholderTextColor={COLORS.textLight}
                    value={amadWeightQtl}
                    onChangeText={setAmadWeightQtl}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Condition */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Goods Condition</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['Fresh', 'Good', 'Average'].map(cond => (
                    <TouchableOpacity
                      key={cond}
                      onPress={() => setAmadGoodsCondition(cond)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: RADIUS.sm,
                        borderWidth: 1,
                        borderColor: amadGoodsCondition === cond ? '#2E7D32' : '#CCC',
                        backgroundColor: amadGoodsCondition === cond ? '#E8F5E9' : '#FFF',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontWeight: '600', color: amadGoodsCondition === cond ? '#2E7D32' : '#555' }}>
                        {cond}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.fetchActionBtn, amadSubmitLoading && styles.fetchActionBtnDisabled, { marginTop: 8, marginBottom: 30 }]}
                onPress={handleRegisterAmad}
                disabled={amadSubmitLoading || dbFarmers.length === 0}
                activeOpacity={0.85}
              >
                {!amadSubmitLoading && dbFarmers.length > 0 && (
                  <LinearGradient
                    colors={[COLORS.greenDeep, COLORS.greenMid]}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                {amadSubmitLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.fetchActionBtnText}>Record Amad Lot</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
           </View>
        </View>
      </Modal>

      {/* ════════════ MY STOCK MODAL ════════════ */}
      <Modal
        visible={myStockModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMyStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Stored Crops / मेरी फसलें</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setMyStockModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* List of Holdings */}
            <FlatList
              data={holdingsList}
              keyExtractor={(item, index) => (item.lot_id || index.toString()) + index}
              contentContainerStyle={{ padding: 24, gap: 16 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No crop stock registered for this farmer.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isFresh = (item.status || '').toLowerCase() === 'fresh' || (item.status || '').toLowerCase() === 'stored';
                const badgeBg = isFresh ? '#E8F5E9' : '#E3F2FD';
                const badgeText = isFresh ? '#2E7D32' : '#1565C0';
                
                return (
                  <View style={[styles.csActivityCard, { width: '100%', marginVertical: 0 }]}>
                    <View style={styles.csActivityHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.csActivityTitle}>
                          {item.crop} — {item.variety}
                        </Text>
                        <Text style={styles.csActivitySubtitle}>
                          🏢 {item.cold_storage} · Location: {item.location}
                        </Text>
                      </View>
                      <View style={[styles.csActivityBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.csActivityBadgeText, { color: badgeText }]}>
                          {item.status || 'Stored'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.csActivityMetaGrid}>
                      <View style={styles.csActivityMetaItem}>
                        <Text style={styles.csActivityMetaLabel}>Bags</Text>
                        <Text style={styles.csActivityMetaValue}>{item.bags}</Text>
                      </View>
                      <View style={styles.csActivityMetaDivider} />
                      <View style={styles.csActivityMetaItem}>
                        <Text style={styles.csActivityMetaLabel}>Weight</Text>
                        <Text style={styles.csActivityMetaValue}>{item.weight}</Text>
                      </View>
                      <View style={styles.csActivityMetaDivider} />
                      <View style={styles.csActivityMetaItem}>
                        <Text style={styles.csActivityMetaLabel}>Storage Age</Text>
                        <Text style={styles.csActivityMetaValue}>{item.inbound_age || `${item.age_days}d`}</Text>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ════════════ INVENTORY MODAL ════════════ */}
      <Modal
        visible={inventoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInventoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Facility Inventory / गोदाम इन्वेंटरी</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setInventoryModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* List of Holdings */}
            {inventoryLoading ? (
              <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={inventoryList}
                keyExtractor={(item, index) => (item.lot_id || index.toString()) + index}
                contentContainerStyle={{ padding: 24, gap: 16 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No crop lots registered in this cold storage.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isFresh = (item.status || '').toLowerCase() === 'fresh' || (item.status || '').toLowerCase() === 'stored';
                  const badgeBg = isFresh ? '#E8F5E9' : '#E3F2FD';
                  const badgeText = isFresh ? '#2E7D32' : '#1565C0';
                  
                  return (
                    <View style={[styles.csActivityCard, { width: '100%', marginVertical: 0 }]}>
                      <View style={styles.csActivityHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.csActivityTitle}>
                            {item.crop} — {item.variety}
                          </Text>
                          <Text style={styles.csActivitySubtitle}>
                            Location: {item.location} · Lot: {item.lot_id || 'N/A'}
                          </Text>
                        </View>
                        <View style={[styles.csActivityBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.csActivityBadgeText, { color: badgeText }]}>
                            {item.status || 'Stored'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.csActivityMetaGrid}>
                        <View style={styles.csActivityMetaItem}>
                          <Text style={styles.csActivityMetaLabel}>Bags</Text>
                          <Text style={styles.csActivityMetaValue}>{item.bags}</Text>
                        </View>
                        <View style={styles.csActivityMetaDivider} />
                        <View style={styles.csActivityMetaItem}>
                          <Text style={styles.csActivityMetaLabel}>Weight</Text>
                          <Text style={styles.csActivityMetaValue}>{item.weight}</Text>
                        </View>
                        <View style={styles.csActivityMetaDivider} />
                        <View style={styles.csActivityMetaItem}>
                          <Text style={styles.csActivityMetaLabel}>Storage Age</Text>
                          <Text style={styles.csActivityMetaValue}>{item.inbound_age || `${item.age_days}d`}</Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  scrollContainer: {
    flexGrow: 1,
  },

  // App Header
  header: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 64,
    paddingBottom: 26,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 13,
    color: '#A8D5BA',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  headerAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4882D',
    marginTop: 10,
    opacity: 0.8,
  },

  // Tab Bar
  tabOuterContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 4,
    width: '92%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  tabButtonActive: {
    // handled by LinearGradient internally
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    zIndex: 2,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // General Tab Content
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.greenDeep,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },

  // Mandi: Empty State Card
  emptyStateCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    marginBottom: 20,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textMid,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Unified Mandi Price Dashboard Card
  priceDashboard: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.md,
  },
  dashboardAccentBar: {
    height: 4,
    backgroundColor: COLORS.greenMid,
  },
  dashboardBody: {
    padding: 22,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cropIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0F7F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardIcon: {
    fontSize: 24,
  },
  dashboardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  dashboardLocation: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  dashboardDivider: {
    height: 1,
    backgroundColor: '#F3EFE3',
    marginVertical: 18,
  },
  priceCardsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  // Spread Gauge Slider
  spreadGaugeContainer: {
    marginTop: 8,
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EBE0',
  },
  spreadGaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spreadGaugeMin: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenMid,
  },
  spreadGaugeSpread: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.greenDeep,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spreadGaugeMax: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.amber,
  },
  spreadGaugeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },

  // Detailed Deal Card styling
  dealCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  dealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealMarket: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dealVariety: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: '500',
  },
  dealModalBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  dealModalLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  dealModalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B5E20',
    marginTop: 1,
  },
  dealDivider: {
    height: 1,
    backgroundColor: '#F5ECE1',
    marginVertical: 12,
  },
  dealPriceGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealPriceItem: {
    flex: 1,
    alignItems: 'center',
  },
  dealPriceDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#FAF5EE',
  },
  dealPriceLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealPriceValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  dealFarmerRow: {
    marginTop: 12,
    backgroundColor: '#FAF8F3',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F0EBE0',
  },
  dealFarmerTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealFarmerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAD9B0',
    marginRight: 8,
  },
  dealFarmerText: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  dealFarmerAction: {
    fontSize: 9,
    color: COLORS.greenMid,
    fontWeight: '700',
    marginTop: 1,
  },

  // Filter Section
  filterSection: {
    width: '100%',
    marginBottom: 8,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  dropdownFieldDisabled: {
    opacity: 0.45,
  },
  dropdownIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FAF0E0',
  },
  dropdownFieldInner: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dropdownChevron: {
    fontSize: 20,
    fontWeight: '300',
    color: '#C4B99A',
    marginLeft: 8,
  },

  // Fetch Action Button
  fetchActionBtn: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#4A5D4E', // fallback background color if disabled
    ...SHADOWS.md,
  },
  fetchActionBtnDisabled: {
    opacity: 0.35,
  },
  fetchActionBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    zIndex: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  // Farmer Registry (Storage) Carousel Selector
  farmerSelectScroll: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 12,
    marginBottom: 20,
  },
  farmerSelectCard: {
    width: 90,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  farmerSelectCardActive: {
    borderColor: COLORS.greenDeep,
    backgroundColor: '#F3F7F5',
  },
  farmerSelectAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0EBE0',
  },
  farmerSelectAvatarActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.greenLight,
    borderWidth: 1.5,
  },
  farmerActiveBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  farmerSelectName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  farmerSelectNameActive: {
    color: COLORS.greenDeep,
    fontWeight: '800',
  },
  farmerSelectId: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Farmer Profile Card
  farmerCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAD9B0',
    ...SHADOWS.md,
  },
  farmerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  farmerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#EAD9B0',
    borderWidth: 1,
  },
  farmerAvatarText: {
    fontSize: 20,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.greenDeep,
  },
  farmerSerial: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  verifiedBadgeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  farmerDivider: {
    height: 1,
    backgroundColor: '#F5ECE1',
    marginVertical: 12,
  },
  farmerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  farmerMeta: {
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: '600',
  },

  // Cold Storage Cards
  storageCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  storageIdBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  storageIdText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  storageStatusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  storageStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  storageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  storageFacility: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 16,
  },
  storageDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },

  // Stock Capacity Load Meter
  storageMeterContainer: {
    marginBottom: 14,
    marginTop: 4,
  },
  storageMeterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  storageMeterLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  storageMeterPct: {
    fontSize: 9,
    color: '#334155',
    fontWeight: '700',
  },
  storageMeterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  storageMeterFill: {
    height: 6,
    borderRadius: 3,
  },

  storageMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageMetaCol: {
    flex: 1,
    alignItems: 'center',
  },
  storageMetaLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 4,
  },
  storageMetaValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  outlinedActionBtn: {
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 14,
  },
  outlinedActionBtnText: {
    color: COLORS.greenMid,
    fontSize: 13,
    fontWeight: '700',
  },

  // Weather Search
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  searchButton: {
    backgroundColor: COLORS.greenDeep,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    ...SHADOWS.sm,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Weather Card Gradient Wrapper
  weatherCardOuter: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
    marginBottom: 20,
  },
  weatherCardGradient: {
    padding: 22,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weatherLocation: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  weatherConditionBadge: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weatherConditionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  weatherEmoji: {
    fontSize: 52,
  },
  weatherTemp: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  weatherDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMid,
    textTransform: 'capitalize',
    marginBottom: 16,
  },

  // Agricultural Weather Advisory Banner
  advisoryBanner: {
    backgroundColor: 'rgba(45, 106, 79, 0.08)',
    borderRadius: RADIUS.md,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.greenMid,
    marginBottom: 18,
  },
  advisoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: 4,
  },
  advisoryText: {
    fontSize: 12,
    color: COLORS.textMid,
    lineHeight: 16,
    fontWeight: '500',
  },

  weatherDetails: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  weatherDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  weatherDetailDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  weatherDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  weatherDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },

  // 5-Day Forecast
  forecastContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 24,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDeep,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  forecastScroll: {
    gap: 12,
    paddingRight: 12,
  },
  forecastCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 14,
    width: 110,
    alignItems: 'center',
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  forecastDayName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  forecastEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  forecastTempMax: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  forecastTempMin: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  forecastCondition: {
    fontSize: 10,
    color: COLORS.textMid,
    textTransform: 'capitalize',
    textAlign: 'center',
    width: '100%',
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EAD9B0',
    backgroundColor: '#FAF5E8',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.wheat,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAD9B0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.greenDeep,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAD9B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDeep,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EAD9B0',
  },
  modalSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: COLORS.textDark,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  stateItemSelected: {
    backgroundColor: 'rgba(45, 106, 79, 0.08)',
  },
  stateItemText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  stateItemTextSelected: {
    color: COLORS.greenDeep,
    fontWeight: '700',
  },
  checkMark: {
    fontSize: 18,
    color: COLORS.greenMid,
    fontWeight: '700',
  },
  activeStripe: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.greenMid,
    marginRight: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#EAD9B0',
    marginHorizontal: 24,
  },
  modalLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  formGroup: {
    width: '100%',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAD9B0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
  },
  outlinedActionBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.greenDeep,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  outlinedActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.greenDeep,
  },
  fetchActionBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.greenDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  fetchActionBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  fetchActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 2,
  },

  // ── Cold Storage Manager Styles ────────────────
  csDashboardHeader: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    ...SHADOWS.md,
  },
  csHeaderGradient: {
    padding: 22,
  },
  csHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  csHeaderSubtitle: {
    fontSize: 12,
    color: '#A8D5BA',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  csHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  csHeaderLocation: {
    fontSize: 13,
    color: '#E8F5E9',
    fontWeight: '500',
    marginTop: 5,
  },
  csBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  csBellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
  },
  csSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  csSummaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  csSummaryCardLabel: {
    fontSize: 11,
    color: '#E8F5E9',
    fontWeight: '600',
  },
  csSummaryCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  csSummaryCardSub: {
    fontSize: 10,
    color: '#A8D5BA',
    fontWeight: '500',
  },
  csSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDeep,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  csSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    marginBottom: 12,
  },
  csViewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.greenMid,
  },
  csGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    rowGap: 12,
  },
  csGridItem: {
    width: '31.5%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEAE5',
    ...SHADOWS.sm,
  },
  csGridIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  csGridLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  csPricesList: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    overflow: 'hidden',
    marginBottom: 24,
    ...SHADOWS.sm,
  },
  csPriceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F4EFE6',
  },
  csPriceName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  csPriceLoc: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  csPriceVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  csPriceTrend: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  csActivityList: {
    width: '100%',
    marginBottom: 24,
  },
  csActivityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  csActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  csActivityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  csActivitySubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  csActivityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  csActivityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  csActivityMetaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F0EBE0',
  },
  csActivityMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  csActivityMetaLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  csActivityMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    color: COLORS.textDark,
  },
  csActivityMetaDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E6DFD3',
  },
  csWeatherCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  csWeatherGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  csWeatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  csWeatherIcon: {
    fontSize: 36,
  },
  csWeatherCity: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  csWeatherDesc: {
    fontSize: 11,
    color: '#E0F2FE',
    fontWeight: '500',
    marginTop: 2,
  },
  csWeatherRight: {
    alignItems: 'flex-end',
  },
  csWeatherTemp: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  csWeatherRange: {
    fontSize: 11,
    color: '#E0F2FE',
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Cold Storage Dropdown Selector Styles ──────
  csSelectorField: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  csSelectorBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FAF0E0',
  },
  csSelectorLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  csSelectorValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginTop: 2,
  },
  csSelectorChevron: {
    fontSize: 20,
    fontWeight: '300',
    color: '#C4B99A',
    marginLeft: 8,
  },

  // ── Cold Storage Clean White App Header ──────
  csAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  csHamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.greenDeep,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  csHamburgerLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  csAppHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: 0.5,
  },
  csHeaderBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  csHeaderBellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E53E3E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ── Farmer List Card (Selector) ──────
  farmerListCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEAE5',
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  farmerListAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerListName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  farmerListMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
});
