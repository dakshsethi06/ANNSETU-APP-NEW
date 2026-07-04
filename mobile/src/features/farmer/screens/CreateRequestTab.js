import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS } from '../../../core/theme/theme';
import { fetchFarmers, BACKEND_URL } from '../../../core/network/api';

export default function CreateRequestTab({ onBackPress, coldStorageId }) {
  const [step, setStep] = useState(1); // 1: Form, 2: Confirmation
  const [subTab, setSubTab] = useState('new'); // 'new' | 'history'
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [farmerId, setFarmerId] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [commodity, setCommodity] = useState('');
  const [bags, setBags] = useState('');

  // Generated states
  const [requestId, setRequestId] = useState('');
  const [requestDate, setRequestDate] = useState('');

  // Dropdown states
  const [farmersList, setFarmersList] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [farmerDropdownVisible, setFarmerDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadFarmers() {
      setLoadingFarmers(true);
      try {
        const list = await fetchFarmers();
        setFarmersList(list || []);
      } catch (err) {
        console.warn('Failed to fetch farmers in CreateRequestTab:', err.message);
      } finally {
        setLoadingFarmers(false);
      }
    }
    loadFarmers();
  }, []);

  useEffect(() => {
    if (subTab === 'history') {
      loadHistory();
    }
  }, [subTab, coldStorageId]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/dispatches?coldStorageId=${encodeURIComponent(coldStorageId || 'cmmp9txv0000ai3t4wush9trs')}`);
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch history');
      setHistoryList(data.dispatches || []);
    } catch (err) {
      console.warn('Failed to load dispatch history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeliver = async (dispatchId) => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you want to mark this dispatch as Delivered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delivered',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/dispatches/${encodeURIComponent(dispatchId)}/deliver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
              if (!response.ok) throw new Error(`HTTP status ${response.status}`);
              const data = await response.json();
              if (!data.success) throw new Error(data.error || 'Delivery update failed');
              
              Alert.alert('Success', 'Dispatch marked as Delivered successfully!');
              loadHistory();
            } catch (err) {
              console.warn('Failed to mark dispatch delivered:', err.message);
              Alert.alert('Error', err.message || 'Failed to update dispatch status.');
            }
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!farmerId.trim() || !farmerName.trim() || !commodity.trim() || !bags.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all form details before submitting.');
      return;
    }

    const numBags = parseInt(bags);
    if (isNaN(numBags) || numBags <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of bags.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: farmerId,
          coldStorageId: coldStorageId || 'cmmp9txv0000ai3t4wush9trs',
          commodity: commodity,
          bags: numBags,
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create request in database.');
      }

      setRequestId(data.dispatch.nikasiNumber);
      
      const today = new Date(data.dispatch.createdAt);
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      const formattedDate = today.toLocaleDateString('en-IN', options).replace(/ /g, '-');
      setRequestDate(formattedDate);
      
      setStep(2);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.topHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onBackPress} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#1E5C2E" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{step === 1 ? 'Manage Request' : 'Request created successfully'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Subtab Segment Selector */}
      {step === 1 && (
        <View style={s.segmentContainer}>
          <TouchableOpacity 
            style={[s.segmentBtn, subTab === 'new' && s.segmentBtnActive]} 
            onPress={() => setSubTab('new')}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentBtnText, subTab === 'new' && s.segmentBtnTextActive]}>New Request</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.segmentBtn, subTab === 'history' && s.segmentBtnActive]} 
            onPress={() => setSubTab('history')}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentBtnText, subTab === 'history' && s.segmentBtnTextActive]}>Request History</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          subTab === 'new' ? (
            <View>
              <Text style={s.pageTitle}>Request Details</Text>

              {/* Farmer Selector */}
              <View style={s.formGroup}>
                <Text style={s.label}>SELECT FARMER *</Text>
                <TouchableOpacity
                  style={s.dropdownTrigger}
                  onPress={() => setFarmerDropdownVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 14,
                    color: farmerName ? '#18181B' : '#A1A1AA',
                    fontFamily: FONTS.regular,
                    flex: 1,
                  }}>
                    {farmerName ? `${farmerName} (${farmerId})` : 'Select a farmer from list'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#71717A" />
                </TouchableOpacity>
              </View>

              {farmerId ? (
                <View style={s.row}>
                  <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={s.label}>FARMER ID</Text>
                    <TextInput
                      style={[s.input, s.disabledInput]}
                      value={farmerId}
                      editable={false}
                    />
                  </View>
                  <View style={[s.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={s.label}>FARMER NAME</Text>
                    <TextInput
                      style={[s.input, s.disabledInput]}
                      value={farmerName}
                      editable={false}
                    />
                  </View>
                </View>
              ) : null}

              {/* Commodity Input */}
              <View style={s.formGroup}>
                <Text style={s.label}>COMMODITY</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Potato"
                  placeholderTextColor="#A1A1AA"
                  value={commodity}
                  onChangeText={setCommodity}
                />
              </View>

              {/* Number of Bags Input */}
              <View style={s.formGroup}>
                <Text style={s.label}>NUMBER OF BAGS (PACKETS)</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 300"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="numeric"
                  value={bags}
                  onChangeText={setBags}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity style={s.btnPrimary} onPress={handleSubmit} activeOpacity={0.8}>
                <Text style={s.btnPrimaryText}>Submit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={s.pageTitle}>Generated Requests</Text>
              {historyLoading ? (
                <ActivityIndicator size="large" color="#1E5C2E" style={{ marginTop: 40 }} />
              ) : historyList.length === 0 ? (
                <View style={s.emptyHistory}>
                  <Feather name="list" size={48} color="#A1A1AA" style={{ marginBottom: 12 }} />
                  <Text style={s.emptyHistoryText}>No requests generated yet</Text>
                  <Text style={s.emptyHistorySub}>Generated requests will appear here</Text>
                </View>
              ) : (
                <View style={{ marginTop: 4 }}>
                  {historyList.map((item) => {
                    let statusBg = '#FFFBEB';
                    let statusColor = '#B45309';
                    let statusLabel = 'Pending OTP';
                    if (item.status === 'IN_TRANSIT') {
                      statusBg = '#EFF6FF';
                      statusColor = '#1D4ED8';
                      statusLabel = 'In Transit';
                    } else if (item.status === 'DISPATCHED') {
                      statusBg = '#ECFDF5';
                      statusColor = '#047857';
                      statusLabel = 'Delivered';
                    }

                    const formattedDate = new Date(item.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    });

                    return (
                      <View key={item.id} style={s.historyCard}>
                        <View style={s.historyCardHeader}>
                          <View style={s.historyBadgeRow}>
                            <View style={s.historyIdBadge}>
                              <Text style={s.historyIdText}>{item.id_display}</Text>
                            </View>
                            <View style={[s.historyStatusBadge, { backgroundColor: statusBg }]}>
                              <Text style={[s.historyStatusText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                          </View>
                          <Text style={s.historyDateText}>{formattedDate}</Text>
                        </View>
                        <Text style={s.historyTitle}>{item.commodity} — {item.bags} bags</Text>
                        <Text style={s.historySubtitle}>Farmer: {item.farmer_name}</Text>
                        <View style={s.historyFooter}>
                          <Text style={s.historyWeightText}>{item.weight} Qt</Text>
                          {item.vehicle && (
                            <View style={s.historyVehicleBadge}>
                              <Feather name="truck" size={10} color="#71717A" style={{ marginRight: 4 }} />
                              <Text style={s.historyVehicleText}>{item.vehicle}</Text>
                            </View>
                          )}
                        </View>

                        {item.status === 'IN_TRANSIT' && (
                          <TouchableOpacity
                            style={s.deliverBtn}
                            onPress={() => handleDeliver(item.id)}
                            activeOpacity={0.8}
                          >
                            <Feather name="check" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={s.deliverBtnText}>Mark as Delivered</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )
        ) : (
          <View style={{ paddingTop: 10 }}>
            <Text style={s.pageTitle}>Request created successfully</Text>

            {/* Confirmation details card */}
            <View style={s.reviewCard}>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Request ID</Text>
                <Text style={s.reviewValue}>{requestId}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Request Date</Text>
                <Text style={s.reviewValue}>{requestDate}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Farmer ID</Text>
                <Text style={s.reviewValue}>{farmerId}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Farmer Name</Text>
                <Text style={s.reviewValue}>{farmerName}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Commodity</Text>
                <Text style={s.reviewValue}>{commodity}</Text>
              </View>

              <View style={[s.reviewRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                <Text style={s.reviewLabel}>Bags</Text>
                <Text style={s.reviewValue}>{bags}</Text>
              </View>
            </View>



            {/* Return home button */}
            <TouchableOpacity style={s.btnPrimary} onPress={onBackPress} activeOpacity={0.8}>
              <Text style={s.btnPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Farmer Selection Modal */}
      <Modal visible={farmerDropdownVisible} transparent animationType="slide">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setFarmerDropdownVisible(false)}
        >
          <View style={s.modalContainer} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Farmer / किसान चुनें</Text>
              <TouchableOpacity
                onPress={() => setFarmerDropdownVisible(false)}
                style={s.closeBtn}
              >
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={s.searchContainer}>
              <Feather name="search" size={18} color="#71717A" style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name, phone or ID..."
                placeholderTextColor="#A1A1AA"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {loadingFarmers ? (
              <ActivityIndicator size="large" color="#1E5C2E" style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={farmersList.filter(f => 
                  f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (f.phone && f.phone.includes(searchQuery))
                )}
                keyExtractor={(item) => item.serial_number}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.farmerItem}
                    onPress={() => {
                      setFarmerId(item.serial_number);
                      setFarmerName(item.name);
                      setFarmerDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={s.farmerItemIcon}>
                      <Text style={{ fontSize: 16 }}>🌾</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.farmerItemName}>{item.name}</Text>
                      <Text style={s.farmerItemSub}>ID: {item.serial_number} · Phone: {item.phone || 'N/A'}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#A1A1AA" />
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                ListEmptyComponent={
                  <View style={s.emptyList}>
                    <Text style={s.emptyListText}>No farmers found matching query</Text>
                  </View>
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  disabledInput: {
    backgroundColor: '#F4F4F5',
    color: '#71717A',
    borderColor: '#E4E4E7',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    backgroundColor: '#1E5C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: FONTS.bold,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#F4F4F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#18181B',
    paddingVertical: 0,
  },
  farmerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  farmerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  farmerItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  farmerItemSub: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  emptyList: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E8E0CE',
    backgroundColor: '#FAF7F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#1E5C2E',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#18181B',
    marginBottom: 20,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#71717A',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#18181B',
  },
  btnPrimary: {
    backgroundColor: '#1E5C2E',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.sm,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  reviewLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#71717A',
  },
  reviewValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#18181B',
  },
  calloutBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  calloutText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 18,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAE6D9',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.bold,
    color: '#71717A',
  },
  segmentBtnTextActive: {
    color: '#1E5C2E',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
    color: '#18181B',
    textAlign: 'center',
  },
  emptyHistorySub: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
    marginTop: 6,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIdBadge: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  historyIdText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: '#71717A',
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '600',
  },
  historyDateText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#71717A',
  },
  historyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#18181B',
    marginBottom: 4,
  },
  historySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#71717A',
    marginBottom: 10,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F4F4F5',
    paddingTop: 8,
  },
  historyWeightText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#18181B',
  },
  historyVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyVehicleText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: '#71717A',
  },
  deliverBtn: {
    backgroundColor: '#047857',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  deliverBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
});
