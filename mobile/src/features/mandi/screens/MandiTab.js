import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Platform, StatusBar, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchMandiPrices } from '../services/mandiService';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import StateModal from '../../../core/modals/StateModal';
import CityModal from '../../../core/modals/CityModal';
import { FONTS } from '../../../core/theme/theme';

export default function MandiTab({ defaultState = 'Uttar Pradesh' }) {
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
          <Text style={s.filterFormTitle}>Search Live Mandi API</Text>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Crop Name / फसल</Text>
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
              <Text style={s.filterInputLabel}>State</Text>
              <Text style={s.filterInputValue}>{tempState || 'Choose state'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.filterInputRow, { flex: 1 }, !tempState && { opacity: 0.5 }]} 
              onPress={() => setCityModalVisible(true)}
              disabled={!tempState}
            >
              <Text style={s.filterInputLabel}>Mandi / City</Text>
              <Text style={s.filterInputValue}>{tempCity || 'All Mandis'}</Text>
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
            <Text style={[s.tabText, tab === 'mandi' && s.tabTextActive]}>Mandi Rates</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tabBtn, tab === 'auction' && s.tabBtnActive]} 
            onPress={() => setTab('auction')}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === 'auction' && s.tabTextActive]}>Auction Prices</Text>
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

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  // Brand Header matching mockup
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FAF7F0',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12, // squircle rounded-xl
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  searchIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(30, 92, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconBtnActive: {
    backgroundColor: '#1E5C2E',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },

  // Search Filters Overlay
  filterForm: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterFormTitle: {
    fontSize: 14,
    fontWeight: '750',
    color: '#1E5C2E',
    marginBottom: 14,
    fontFamily: FONTS.bold,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#18181B',
    paddingVertical: 0,
    fontFamily: FONTS.regular,
  },
  filterInputRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
  },
  filterInputLabel: {
    fontSize: 10,
    color: '#71717A',
    textTransform: 'uppercase',
    fontWeight: '600',
    fontFamily: FONTS.regular,
    marginBottom: 2,
  },
  filterInputValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  filterResetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  filterResetBtnText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  filterApplyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E5C2E',
    justifyContent: 'center',
  },
  filterApplyBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },

  // Tab Switcher
  tabContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  tabBg: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F5', // bg-secondary
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF', // bg-card shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  tabTextActive: {
    color: '#18181B',
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },

  // Crop horizontal filters list
  cropFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cropScrollView: {
    gap: 8,
  },
  cropPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cropPillActive: {
    backgroundColor: '#1E5C2E', // bg-primary
    borderColor: '#1E5C2E',
  },
  cropPillText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
    fontFamily: FONTS.regular,
  },
  cropPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },

  // Date Refresh Row
  dateRefreshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },

  // Cards list view
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  cardCrop: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  cardLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardLocText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.mono,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.mono,
  },
  auctionMetaText: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  retryBtn: {
    backgroundColor: '#1E5C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },
});
