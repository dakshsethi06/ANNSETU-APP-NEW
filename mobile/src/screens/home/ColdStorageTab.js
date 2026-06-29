import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import ErrorCard from '../../components/ErrorCard';
import CsSelectModal from './modals/CsSelectModal';
import CsRegisterModal from './modals/CsRegisterModal';
import InventoryModal from './modals/InventoryModal';
import layoutStyles from './styles/layoutStyles';
import dashboardStyles from './styles/dashboardStyles';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import ColdStorageMandiPrices from './ColdStorageMandiPrices';
import { useColdStorageDashboard } from '../../hooks/useColdStorageDashboard';

export default function ColdStorageTab({ setActiveTab }) {
  const {
    selectedColdStorageId, setSelectedColdStorageId, csSummary, csLoading, csError, loadColdStorageData,
    coldStoragesList, coldStoragesLoading, csModalVisible, setCsModalVisible,
    csRegisterModalVisible, setCsRegisterModalVisible, inventoryList, inventoryLoading,
    inventoryModalVisible, setInventoryModalVisible, handleOpenInventory
  } = useColdStorageDashboard();

  return (
    <View style={layoutStyles.tabContent}>
      {csLoading ? <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
      : csError ? <ErrorCard message={csError} onRetry={() => loadColdStorageData(selectedColdStorageId)} />
      : csSummary ? (
        <View style={{ width: '100%' }}>
          <View style={dashboardStyles.csDashboardHeader}>
            <LinearGradient colors={['#1E4032', '#2D6A4F']} style={dashboardStyles.csHeaderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={dashboardStyles.csHeaderTopRow}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setCsModalVisible(true)} activeOpacity={0.8}>
                    <Text style={dashboardStyles.csHeaderTitle}>{csSummary.coldStorage.name}  ▼</Text>
                  </TouchableOpacity>
                  <Text style={dashboardStyles.csHeaderLocation}>◎ {csSummary.coldStorage.location}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={[dashboardStyles.csBellBtn, { marginRight: 8 }]} onPress={() => Alert.alert('Alerts', 'No new alerts.')}>
                    <Text style={{ fontSize: 20 }}>🔔</Text><View style={dashboardStyles.csBellDot} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
                    <Feather name="log-out" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={dashboardStyles.csSummaryRow}>
                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Total Stock</Text>
                  <Text style={dashboardStyles.csSummaryCardValue}>{csSummary.stock.packets} bags</Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>{csSummary.stock.weightMt.toFixed(1)} MT stored</Text>
                </View>
                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Total Dues</Text>
                  <Text style={[dashboardStyles.csSummaryCardValue, { color: '#E53E3E' }]}>₹{csSummary.dues.amount.toLocaleString('en-IN')}</Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>From {csSummary.dues.farmersCount} farmers</Text>
                </View>
                <View style={dashboardStyles.csSummaryCard}>
                  <Text style={dashboardStyles.csSummaryCardLabel}>Today's Amad</Text>
                  <Text style={[dashboardStyles.csSummaryCardValue, { color: COLORS.greenLight }]}>{csSummary.todayAmad.packets} bags</Text>
                  <Text style={dashboardStyles.csSummaryCardSub}>{csSummary.todayAmad.entries} arrivals</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <Text style={dashboardStyles.csSectionTitle}>Facility Actions</Text>
          <View style={dashboardStyles.csGridContainer}>
            {[
              { label: 'Inward (Amad)', icon: '📥', bg: '#E8F5E9', color: '#2E7D32' },
              { label: 'Outward', icon: '📤', bg: '#E3F2FD', color: '#1565C0' },
              { label: 'Dues List', icon: '📒', bg: '#FFF3E0', color: '#E65100' },
              { label: 'Inventory', icon: '📋', bg: '#F3E5F5', color: '#4A148C' },
              { label: 'Mandi Rates', icon: '📈', bg: '#E0F7FA', color: '#006064' },
              { label: 'Onboarding CS', icon: '➕', bg: '#FCE4EC', color: '#C62828' }
            ].map((action, idx) => (
              <TouchableOpacity key={action.label + idx} style={dashboardStyles.csGridItem} activeOpacity={0.7}
                onPress={() => {
                  if (action.label === 'Inward (Amad)') setActiveTab('storage');
                  else if (action.label === 'Mandi Rates') setActiveTab('prices');
                  else if (action.label === 'Inventory') handleOpenInventory();
                  else if (action.label === 'Onboarding CS') setCsRegisterModalVisible(true);
                  else Alert.alert(action.label, `${action.label} feature coming soon.`);
                }}>
                <View style={[dashboardStyles.csGridIconContainer, { backgroundColor: action.bg }]}><Text style={{ fontSize: 24 }}>{action.icon}</Text></View>
                <Text style={dashboardStyles.csGridLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ColdStorageMandiPrices setActiveTab={setActiveTab} />
        </View>
      ) : null}

      <CsSelectModal visible={csModalVisible} onClose={() => setCsModalVisible(false)} coldStoragesList={coldStoragesList} coldStoragesLoading={coldStoragesLoading} selectedColdStorageId={selectedColdStorageId} onSelectColdStorage={setSelectedColdStorageId} onRegisterNew={() => setCsRegisterModalVisible(true)} />
      <CsRegisterModal visible={csRegisterModalVisible} onClose={() => setCsRegisterModalVisible(false)} onRegisterSuccess={(newId) => setSelectedColdStorageId(newId)} />
      <InventoryModal visible={inventoryModalVisible} onClose={() => setInventoryModalVisible(false)} inventoryList={inventoryList} inventoryLoading={inventoryLoading} />
    </View>
  );
}
