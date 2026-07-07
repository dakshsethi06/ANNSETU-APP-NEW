import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Platform, StatusBar, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fetchMandiPrices } from '../services/mandiService';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import StateModal from '../../../core/modals/StateModal';
import CityModal from '../../../core/modals/CityModal';
import { FONTS } from '../../../core/theme/theme';
import s from '../styles/mandiTabStyles';

export default function MandiTab({ defaultState = 'Uttar Pradesh' }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('mandi'); // 'mandi' or 'auction'
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [cropInput, setCropInput] = useState('');
  const crops = ["All", "Potato", "Onion", "Garlic", "Tomato", "Bajra"];

  // Search parameters & modals
  const [state, setState] = useState('All');
  const [city, setCity] = useState('All');
  const [tempState, setTempState] = useState('All');
  const [tempCity, setTempCity] = useState('All');
  const [searchVisible, setSearchVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citiesList, setCitiesList] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const handleToggleSearch = () => {
    if (!searchVisible) {
      setTempState(state);
      setTempCity(city);
    }
    setSearchVisible(!searchVisible);
  };

  // Live Mandi rates from API
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);

  // Sync cities list based on state
  const loadCities = async (selectedState) => {
    setCitiesLoading(true);
    try {
      const stateMarkets = {
        'Uttar Pradesh': ['Agra', 'Firozabad', 'Tundla', 'Aligarh', 'Hathras'],
        'Rajasthan': ['Jaipur', 'Alwar', 'Bharatpur', 'Kota', 'Jodhpur'],
        'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda'],
        'Haryana': ['Karnal', 'Ambala', 'Hisar', 'Rohtak', 'Panipat'],
        'Madhya Pradesh': ['Indore', 'Bhopal', 'Ujjain', 'Jabalpur', 'Gwalior'],
        'Maharashtra': ['Pune', 'Nashik', 'Nagpur', 'Mumbai', 'Aurangabad'],
        'Gujarat': ['Ahmedabad', 'Rajkot', 'Surat', 'Vadodara', 'Mehsana'],
        'Bihar': ['Patna', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Purnia'],
        'West Bengal': ['Kolkata', 'Siliguri', 'Burdwan', 'Kharagpur', 'Howrah'],
        'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Belagavi', 'Mangaluru'],
      };

      const markets = ['All', ...(stateMarkets[selectedState] || [])];
      setCitiesList(markets);
    } catch (e) {
      console.warn(e);
    } finally {
      setCitiesLoading(false);
    }
  };

  useEffect(() => {
    loadCities(tempState);
  }, [tempState]);

  // Fetch prices on change
  useEffect(() => {
    handleFetch();
  }, [state, city, selectedCrop]);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const commodityToFetch = selectedCrop;
      const data = await fetchMandiPrices(state, commodityToFetch, city);
      
      let fetchedRecords = data.records || [];
      if (city) {
        fetchedRecords = fetchedRecords.filter(r => r.market.toLowerCase().includes(city.toLowerCase()));
      }
      
      // Map API record fields to UI names
      const mapped = fetchedRecords.map(r => {
        const avg = (parseFloat(r.minPrice) + parseFloat(r.maxPrice)) / 2;
        const changeVal = Math.round(parseFloat(r.modalPrice) - avg) || 0;
        return {
          commodity: r.commodity || commodityToFetch,
          market: r.market || 'Agra',
          price: r.modalPrice || r.maxPrice || '850',
          change: changeVal,
        };
      });

      setRecords(mapped);
    } catch (err) {
      console.warn('Live fetch failed:', err.message);
      setError(err.message || 'No live price data found.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const mockAuctionPrices = [
    { storage: "SN Sharma CS", commodity: "Potato (Pukhraj)", price: 780, bags: 500, date: "Today" },
    { storage: "Agra Cold House", commodity: "Potato (Chipsona)", price: 920, bags: 300, date: "Today" },
    { storage: "Firozabad Bhaar", commodity: "Onion", price: 1050, bags: 200, date: "Yesterday" },
  ];

  const filteredAuctions = mockAuctionPrices.filter(p => 
    selectedCrop === 'All' || p.commodity.toLowerCase().includes(selectedCrop.toLowerCase())
  );

  const getFormattedDate = () => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date().toLocaleDateString('en-GB', options);
  };

  const handlePillPress = (crop) => {
    setSelectedCrop(crop);
    setCropInput(crop === 'All' ? '' : crop);
  };

  return (
    <View style={s.container}>
      {/* ─── Top Brand Header ─── */}
      <View style={s.topHeader}>
        <View style={s.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={s.brandTitle}>Annsetu</Text>
        </View>
        <TouchableOpacity 
          style={[s.searchIconBtn, searchVisible && s.searchIconBtnActive]} 
          onPress={handleToggleSearch}
          activeOpacity={0.8}
        >
          <Feather name="search" size={18} color={searchVisible ? '#FFFFFF' : '#1E5C2E'} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Divider Line */}
      <View style={s.divider} />

      {/* ─── Search Form Overlay ─── */}
      {searchVisible && (
        <View style={s.filterForm}>
          <Text style={s.filterFormTitle}>{t('mandi.search_live_api')}</Text>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>{t('mandi.crop_name')}</Text>
            <View style={s.textInputWrapper}>
              <Feather name="edit-2" size={14} color="#A1A1AA" style={{ marginRight: 8 }} />
              <TextInput
                style={s.textInput}
                placeholder="Search any crop (e.g. Wheat, Rice, Garlic)"
                placeholderTextColor="#A1A1AA"
                value={cropInput}
                onChangeText={setCropInput}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity style={[s.filterInputRow, { flex: 1 }]} onPress={() => setStateModalVisible(true)}>
              <Text style={s.filterInputLabel}>{t('register.state')}</Text>
              <Text style={s.filterInputValue}>{tempState || t('mandi.choose_state')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.filterInputRow, { flex: 1 }, !tempState && { opacity: 0.5 }]} 
              onPress={() => setCityModalVisible(true)}
              disabled={!tempState}
            >
              <Text style={s.filterInputLabel}>{t('register.district')}</Text>
              <Text style={s.filterInputValue}>{tempCity || t('mandi.all_mandis')}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.filterButtonsRow}>
            <TouchableOpacity 
              style={s.filterResetBtn} 
              onPress={() => { 
                setTempState('All'); 
                setTempCity('All'); 
                setCropInput('All');
              }}
            >
              <Text style={s.filterResetBtnText}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={s.filterApplyBtn} 
              onPress={() => { 
                setState(tempState);
                setCity(tempCity);
                setSelectedCrop(cropInput.trim() || 'All');
                setSearchVisible(false); 
              }}
            >
              <Text style={s.filterApplyBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Tab Bar Switcher ─── */}
      <View style={s.tabContainer}>
        <View style={s.tabBg}>
          <TouchableOpacity 
            style={[s.tabBtn, tab === 'mandi' && s.tabBtnActive]} 
            onPress={() => setTab('mandi')}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === 'mandi' && s.tabTextActive]}>{t('mandi.mandi_rates')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tabBtn, tab === 'auction' && s.tabBtnActive]} 
            onPress={() => setTab('auction')}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === 'auction' && s.tabTextActive]}>{t('mandi.auction_prices')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Crop Filter List ─── */}
      <View style={s.cropFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cropScrollView}>
          {crops.map(c => {
            const isActive = selectedCrop.toLowerCase() === c.toLowerCase();
            return (
              <TouchableOpacity
                key={c}
                style={[s.cropPill, isActive && s.cropPillActive]}
                onPress={() => handlePillPress(c)}
                activeOpacity={0.8}
              >
                <Text style={[s.cropPillText, isActive && s.cropPillTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
          {selectedCrop !== 'All' && !crops.includes(selectedCrop) && (
            <TouchableOpacity
              style={[s.cropPill, s.cropPillActive]}
              onPress={() => handlePillPress('All')}
              activeOpacity={0.8}
            >
              <Text style={[s.cropPillText, s.cropPillTextActive]}>Search: {selectedCrop} ✕</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ─── Date Badge & Refresh ─── */}
      <View style={s.dateRefreshRow}>
        <View style={s.dateBadge}>
          <Feather name="calendar" size={12} color="#71717A" style={{ marginRight: 6 }} />
          <Text style={s.dateText}>{getFormattedDate()}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={handleFetch} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={11} color="#1E5C2E" style={{ marginRight: 4 }} />
          <Text style={s.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Mandi / Auction Card Lists ─── */}
      <ScrollView 
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#1E5C2E" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={s.errorCard}>
            <Feather name="wifi-off" size={32} color="#DC2626" style={{ marginBottom: 12 }} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={handleFetch} activeOpacity={0.8}>
              <Text style={s.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : tab === 'mandi' ? (
          records.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No price records found for "{selectedCrop}".</Text>
            </View>
          ) : (
            records.map((p, i) => {
              const isUp = p.change >= 0;
              return (
                <View key={i} style={s.card}>
                  <View style={s.cardLeft}>
                    <Text style={s.cardCrop}>{p.commodity}</Text>
                    <View style={s.cardLocRow}>
                      <Feather name="map-pin" size={11} color="#71717A" style={{ marginRight: 4 }} />
                      <Text style={s.cardLocText}>{p.market} Mandi</Text>
                    </View>
                  </View>
                  
                  <View style={s.cardRight}>
                    <Text style={s.cardPrice}>₹{p.price} / qtl</Text>
                    <View style={s.trendRow}>
                      <Feather 
                        name={isUp ? 'arrow-up-right' : 'arrow-down-left'} 
                        size={12} 
                        color={isUp ? '#059669' : '#DC2626'} 
                        style={{ marginRight: 2 }} 
                      />
                      <Text style={[s.trendText, { color: isUp ? '#059669' : '#DC2626' }]}>
                        {isUp ? '+' : ''}{p.change}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )
        ) : (
          filteredAuctions.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No auction prices found for "{selectedCrop}".</Text>
            </View>
          ) : (
            filteredAuctions.map((p, i) => (
              <View key={i} style={s.card}>
                <View style={s.cardLeft}>
                  <Text style={s.cardCrop}>{p.commodity}</Text>
                  <View style={s.cardLocRow}>
                    <Feather name="map-pin" size={11} color="#71717A" style={{ marginRight: 4 }} />
                    <Text style={s.cardLocText}>{p.storage}</Text>
                  </View>
                </View>
                
                <View style={s.cardRight}>
                  <Text style={s.cardPrice}>₹{p.price} / qtl</Text>
                  <Text style={s.auctionMetaText}>{p.bags} bags · {p.date}</Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* State & City Modals */}
      <StateModal visible={stateModalVisible} onClose={() => setStateModalVisible(false)} selectedState={tempState} onSelectState={(v) => { setTempState(v); setTempCity('All'); }} />
      <CityModal visible={cityModalVisible} onClose={() => setCityModalVisible(false)} selectedCity={tempCity} onSelectCity={setTempCity} citiesList={citiesList} citiesLoading={citiesLoading} />
    </View>
  );
}


