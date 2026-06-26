import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { fetchFarmers, fetchHoldings } from '../../services/api';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import ErrorCard from '../../components/ErrorCard';
import RegisterFarmerModal from './modals/RegisterFarmerModal';
import AmadModal from './modals/AmadModal';
import MyStockModal from './modals/MyStockModal';
import layoutStyles from './styles/layoutStyles';
import dashboardStyles from './styles/dashboardStyles';
import storageStyles from './styles/storageStyles';

export default function StorageTab({ setActiveTab }) {
  const [dbFarmers, setDbFarmers] = useState([]);
  const [dbFarmersLoading, setDbFarmersLoading] = useState(false);
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');

  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [farmerData, setFarmerData] = useState(null);
  const [farmerError, setFarmerError] = useState(null);

  const [holdingsList, setHoldingsList] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState(null);

  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [amadModalVisible, setAmadModalVisible] = useState(false);
  const [myStockModalVisible, setMyStockModalVisible] = useState(false);

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
    setHoldingsLoading(true);
    setHoldingsError(null);
    try {
      const farmers = await fetchFarmers('', farmerId);
      if (farmers && farmers.length > 0) {
        setFarmerData(farmers[0]);
      } else {
        throw new Error('Farmer profile not found.');
      }
      const holdings = await fetchHoldings();
      setHoldingsList(holdings.filter((h) => h.id === farmerId) || []);
    } catch (err) {
      setFarmerError(err.message);
    } finally {
      setFarmerLoading(false);
      setHoldingsLoading(false);
    }
  };

  const filteredDbFarmers = dbFarmers.filter(
    (f) =>
      f.name.toLowerCase().includes(farmerSearchQuery.toLowerCase()) ||
      (f.state && f.state.toLowerCase().includes(farmerSearchQuery.toLowerCase()))
  );

  return (
    <View style={layoutStyles.tabContent}>
      {dbFarmersLoading ? (
        <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
      ) : !selectedFarmerId ? (
        /* --- Farmer Selector list --- */
        <View style={{ width: '100%' }}>
          <Text style={dashboardStyles.csSectionTitle}>Select a Farmer</Text>
          <Text style={[layoutStyles.subtitle, { marginBottom: 16, textAlign: 'left' }]}>
            Choose a farmer profile to view their dashboard
          </Text>

          <View style={storageStyles.searchContainer}>
            <TextInput
              style={storageStyles.searchInput}
              placeholder="Search farmers..."
              placeholderTextColor={COLORS.textLight}
              value={farmerSearchQuery}
              onChangeText={setFarmerSearchQuery}
              autoCorrect={false}
            />
            <TouchableOpacity style={storageStyles.searchButton} onPress={() => setRegisterModalVisible(true)} activeOpacity={0.8}>
              <Text style={storageStyles.searchButtonText}>➕ Register</Text>
            </TouchableOpacity>
          </View>

          {filteredDbFarmers.map((f) => (
            <TouchableOpacity key={f.serial_number} style={storageStyles.farmerListCard} onPress={() => handleSelectFarmer(f.serial_number)} activeOpacity={0.7}>
              <View style={storageStyles.farmerListAvatar}>
                <Text style={{ fontSize: 22 }}>👨‍🌾</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={storageStyles.farmerListName}>{f.name}</Text>
                <Text style={storageStyles.farmerListMeta}>{f.village ? `${f.village}, ` : ''}{f.district || f.state || 'Rajasthan'}</Text>
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
        /* --- Farmer Dashboard --- */
        <View style={{ width: '100%' }}>
          <View style={dashboardStyles.csDashboardHeader}>
            <LinearGradient colors={['#1B4332', '#2D6A4F']} style={dashboardStyles.csHeaderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={dashboardStyles.csHeaderTopRow}>
                <TouchableOpacity onPress={() => { setSelectedFarmerId(null); setFarmerData(null); }} activeOpacity={0.8}>
                  <Text style={dashboardStyles.csHeaderTitle}>◀  {farmerData.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={dashboardStyles.csBellBtn} onPress={() => Alert.alert('Alerts', 'No new alerts.')}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                  <View style={dashboardStyles.csBellDot} />
                </TouchableOpacity>
              </View>

              <View style={dashboardStyles.csSummaryRow}>
                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Total Stock</Text>
                  <Text style={dashboardStyles.csSummaryCardValue}>
                    {holdingsList.length > 0
                      ? `${holdingsList.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0).toFixed(1)} MT`
                      : '0.0 MT'}
                  </Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>
                    {holdingsList.length > 0 ? `${holdingsList.reduce((sum, h) => sum + (h.bags || 0), 0)} bags` : '0 bags'}
                  </Text>
                </View>

                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Pending Rent</Text>
                  <Text style={[dashboardStyles.csSummaryCardValue, { color: '#E53E3E' }]}>
                    ₹{farmerData.pendingRent ? parseFloat(farmerData.pendingRent).toLocaleString('en-IN') : '0'}
                  </Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>
                    {parseFloat(farmerData.pendingRent || 0) > 0 ? 'Overdue' : 'No dues'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <Text style={dashboardStyles.csSectionTitle}>Quick Actions</Text>
          <View style={dashboardStyles.csGridContainer}>
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
                style={dashboardStyles.csGridItem}
                onPress={() => {
                  if (action.label === 'My Stock') setMyStockModalVisible(true);
                  else if (action.label === 'Mandi Rates') setActiveTab('prices');
                  else if (action.label === 'Weather') setActiveTab('weather');
                  else if (action.label === 'Book Space') setAmadModalVisible(true);
                  else Alert.alert(action.label, `${action.label} feature coming soon.`);
                }}
                activeOpacity={0.7}
              >
                <View style={[dashboardStyles.csGridIconContainer, { backgroundColor: action.bg }]}>
                  <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                </View>
                <Text style={dashboardStyles.csGridLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Modals */}
      <RegisterFarmerModal visible={registerModalVisible} onClose={() => setRegisterModalVisible(false)} onRegisterSuccess={loadDbFarmers} />
      <AmadModal visible={amadModalVisible} onClose={() => setAmadModalVisible(false)} dbFarmers={dbFarmers} defaultFarmerId={selectedFarmerId} onAmadSuccess={() => selectedFarmerId && handleSelectFarmer(selectedFarmerId)} />
      <MyStockModal visible={myStockModalVisible} onClose={() => setMyStockModalVisible(false)} holdingsList={holdingsList} />
    </View>
  );
}
