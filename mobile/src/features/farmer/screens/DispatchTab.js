import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Modal, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SHADOWS, FONTS } from '../../../core/theme/theme';
import s from '../styles/dispatchTabStyles';
import { BACKEND_URL } from '../../../core/network/config';

export default function DispatchTab({ farmerId, onBackPress }) {
  const { t } = useTranslation();
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [otpText, setOtpText] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Request states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createCommodity, setCreateCommodity] = useState('Potato');
  const [createBags, setCreateBags] = useState('');
  const [createVehicle, setCreateVehicle] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Reset MPIN states
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewMpin, setResetNewMpin] = useState('');
  const [resettingMpin, setResettingMpin] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleCreateDispatch = async () => {
    if (!createCommodity.trim() || !createBags.trim()) {
      Alert.alert('Missing Fields', 'Please enter commodity and number of bags.');
      return;
    }
    const bagsNum = parseInt(createBags);
    if (isNaN(bagsNum) || bagsNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of bags.');
      return;
    }

    setSubmittingCreate(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: farmerId,
          coldStorageId: '7895544442',
          commodity: createCommodity.trim(),
          bags: bagsNum,
          vehicleNumber: createVehicle.trim()
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit dispatch request.');
      }

      Alert.alert('Success', 'Dispatch request submitted successfully! Cold Storage will review and approve your request via MPIN.');
      setCreateModalVisible(false);
      setCreateBags('');
      setCreateVehicle('');
      loadDispatches();
    } catch (err) {
      console.warn('Dispatch request failed:', err.message);
      Alert.alert('Error', err.message || 'Failed to create dispatch request.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (resetPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setSendingOtp(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/farmers/reset-mpin/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP.');
      }
      Alert.alert('Success', 'Verification OTP sent successfully!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetMpinSubmit = async () => {
    if (resetPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (resetOtp.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification OTP.');
      return;
    }
    if (resetNewMpin.length < 4) {
      Alert.alert('Error', 'New MPIN must be exactly 4 digits.');
      return;
    }

    setResettingMpin(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/farmers/reset-mpin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone, otp: resetOtp, newMpin: resetNewMpin }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset MPIN.');
      }
      Alert.alert('Success', 'MPIN reset successfully! You can now authorize dispatches.');
      setResetModalVisible(false);
      setOtpText('');
    } catch (err) {
      Alert.alert('Reset Failed', err.message);
    } finally {
      setResettingMpin(false);
    }
  };

  useEffect(() => {
    loadDispatches();
  }, [farmerId]);

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/dispatches?farmerId=${encodeURIComponent(farmerId)}`);
      if (!response.ok) throw new Error(`Server status ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch dispatches');
      setDispatches(data.dispatches || []);
    } catch (err) {
      console.warn('Failed to load dispatches:', err.message);
      Alert.alert('Error', 'Failed to load dispatch transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePress = (item) => {
    setSelectedDispatch(item);
    setOtpText('');
    setOtpModalVisible(true);
  };

  const handleConfirmOtp = async () => {
    if (otpText.length < 4) {
      Alert.alert('Invalid MPIN', 'Please enter the complete 4-digit security MPIN.');
      return;
    }
    setSubmittingOtp(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/dispatches/${encodeURIComponent(selectedDispatch.id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpin: otpText }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned status ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Approval failed');

      Alert.alert('Success', 'Dispatch transaction authorized successfully!');
      setOtpModalVisible(false);
      loadDispatches();
    } catch (err) {
      console.warn('Approval failed:', err.message);
      Alert.alert('Error', err.message || 'Failed to authorize dispatch.');
    } finally {
      setSubmittingOtp(false);
    }
  };

  const totals = dispatches.reduce(
    (acc, d) => {
      if (d.status === 'CREATED') acc.pending++;
      else if (d.status === 'IN_TRANSIT') acc.intransit++;
      else if (d.status === 'DISPATCHED') acc.delivered++;
      return acc;
    },
    { intransit: 0, pending: 0, delivered: 0 }
  );

  const getStatusConfig = (status) => {
    switch (status) {
      case 'CREATED':
        return { label: 'Pending', color: '#B45309', bg: '#FFFBEB', icon: 'clock' };
      case 'IN_TRANSIT':
        return { label: 'In Transit', color: '#1D4ED8', bg: '#EFF6FF', icon: 'truck' };
      case 'DISPATCHED':
        return { label: 'Delivered', color: '#047857', bg: '#ECFDF5', icon: 'check-circle' };
      default:
        return { label: 'Cancelled', color: '#B91C1C', bg: '#FEF2F2', icon: 'x-circle' };
    }
  };

  const filteredDispatches = dispatches.filter(d => {
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.topHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onBackPress} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#1E5C2E" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('dispatch.dispatch_title')}</Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#1E5C2E',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', fontFamily: FONTS.bold }}>+ Request</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#1E5C2E" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary stats */}
          <View style={s.summaryContainer}>
            <TouchableOpacity
              style={[
                s.summaryCard,
                statusFilter === 'IN_TRANSIT' && { borderColor: '#1D4ED8', borderWidth: 2, backgroundColor: '#EFF6FF' }
              ]}
              onPress={() => setStatusFilter(statusFilter === 'IN_TRANSIT' ? 'ALL' : 'IN_TRANSIT')}
              activeOpacity={0.7}
            >
              <Text style={[s.summaryValue, { color: '#1D4ED8' }]}>{totals.intransit}</Text>
              <Text style={s.summaryLabel}>In Transit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.summaryCard,
                statusFilter === 'CREATED' && { borderColor: '#B45309', borderWidth: 2, backgroundColor: '#FFFBEB' }
              ]}
              onPress={() => setStatusFilter(statusFilter === 'CREATED' ? 'ALL' : 'CREATED')}
              activeOpacity={0.7}
            >
              <Text style={[s.summaryValue, { color: '#B45309' }]}>{totals.pending}</Text>
              <Text style={s.summaryLabel}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.summaryCard,
                statusFilter === 'DISPATCHED' && { borderColor: '#047857', borderWidth: 2, backgroundColor: '#ECFDF5' }
              ]}
              onPress={() => setStatusFilter(statusFilter === 'DISPATCHED' ? 'ALL' : 'DISPATCHED')}
              activeOpacity={0.7}
            >
              <Text style={[s.summaryValue, { color: '#047857' }]}>{totals.delivered}</Text>
              <Text style={s.summaryLabel}>Delivered</Text>
            </TouchableOpacity>
          </View>

          {/* Cards List */}
          {filteredDispatches.length === 0 ? (
            <View style={s.emptyState}>
              <Feather name="truck" size={48} color="#A1A1AA" />
              <Text style={s.emptyText}>{t('dispatch.no_dispatch_entries')}</Text>
            </View>
          ) : (
            filteredDispatches.map((item) => {
              const cfg = getStatusConfig(item.status);
              const formatDateSafe = (dateStr) => {
                try {
                  const d = new Date(dateStr);
                  if (isNaN(d.getTime())) return dateStr;
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}`;
                } catch (e) {
                  return dateStr;
                }
              };
              const formattedDate = formatDateSafe(item.date);

              return (
                <View key={item.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <View style={s.badgeRow}>
                      <View style={s.idBadge}>
                        <Text style={s.idText}>{item.id_display}</Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Feather name={cfg.icon} size={11} color={cfg.color} style={{ marginRight: 4 }} />
                        <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <View style={s.rightHeader}>
                      <Text style={s.weightText}>{item.weight} Qt</Text>
                      <Text style={s.dateText}>{formattedDate}</Text>
                    </View>
                  </View>

                  <Text style={s.cardTitle}>{item.commodity} — {item.bags} bags</Text>
                  <Text style={s.cardSubtitle}>Buyer: {item.buyer} · {item.cold_storage_name || 'Cold Storage'}</Text>

                  {item.vehicle && (
                    <View style={s.vehicleRow}>
                      <Feather name="truck" size={13} color="#71717A" style={{ marginRight: 6 }} />
                      <Text style={s.vehicleText}>{item.vehicle}</Text>
                    </View>
                  )}

                  {item.status === 'CREATED' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                      <Feather name="clock" size={14} color="#B45309" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#B45309', fontSize: 12, fontWeight: 'bold', fontFamily: FONTS.bold }}>
                        Pending Cold Storage Approval
                      </Text>
                    </View>
                  )}

                  {item.status === 'IN_TRANSIT' && (
                    <View style={s.transitRow}>
                      <Feather name="truck" size={14} color="#1D4ED8" style={{ marginRight: 6 }} />
                      <Text style={s.transitText}>{t('dispatch.in_transit')}</Text>
                    </View>
                  )}

                  {item.status === 'DISPATCHED' && (
                    <View style={s.deliveredRow}>
                      <Feather name="check-circle" size={14} color="#047857" style={{ marginRight: 6 }} />
                      <Text style={s.deliveredText}>{t('dispatch.delivered_confirmed')}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* OTP Authentication Modal */}
      <Modal visible={otpModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setOtpModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={s.modalContainer} onStartShouldSetResponder={() => true}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Authorize Dispatch</Text>
                <TouchableOpacity
                  onPress={() => setOtpModalVisible(false)}
                  style={s.closeBtn}
                >
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={s.modalBody}>
                {selectedDispatch && (
                  <View style={s.calloutBox}>
                    <Text style={s.calloutTitle}>{selectedDispatch.id_display} — {selectedDispatch.commodity}</Text>
                    <Text style={s.calloutSub}>{selectedDispatch.bags} bags to {selectedDispatch.buyer} at {selectedDispatch.cold_storage_name || 'Cold Storage'}</Text>
                  </View>
                )}

                <Text style={s.otpInstructions}>Enter your 4-digit security MPIN to authorize</Text>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: -4, marginBottom: 16 }}
                  onPress={() => {
                    setResetPhone(farmerId || '');
                    setResetOtp('');
                    setResetNewMpin('');
                    setResetModalVisible(true);
                    setOtpModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#1E5C2E', fontSize: 13, textDecorationLine: 'underline', fontWeight: 'bold', fontFamily: FONTS.bold }}>
                    Forgot MPIN? Click here
                  </Text>
                </TouchableOpacity>

                {/* MPIN Input fields */}
                <View style={s.otpInputRow}>
                  {[0, 1, 2, 3].map((index) => {
                    const char = otpText[index] ? '●' : '';
                    return (
                      <View key={index} style={[s.otpBox, otpText.length === index && s.otpBoxActive]}>
                        <Text style={[s.otpCharText, { fontSize: 18 }]}>{char}</Text>
                      </View>
                    );
                  })}
                  <TextInput
                    style={s.hiddenInput}
                    value={otpText}
                    onChangeText={setOtpText}
                    keyboardType="number-pad"
                    maxLength={4}
                    caretHidden
                  />
                </View>

                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={handleConfirmOtp}
                  disabled={submittingOtp}
                  activeOpacity={0.8}
                >
                  {submittingOtp ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={s.submitBtnText}>Authorize Dispatch</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Reset MPIN Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FAF7F0', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E8E0CE' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E5C2E', fontFamily: FONTS.bold }}>
                Reset Security MPIN
              </Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Feather name="x" size={22} color="#1E5C2E" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8, fontFamily: FONTS.bold }}>
              Mobile Number
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(30, 92, 46, 0.12)', borderRadius: 12, paddingHorizontal: 16, height: 52, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A2E1A' }}>+91</Text>
              <View style={{ width: 1, height: 20, backgroundColor: 'rgba(30, 92, 46, 0.12)', marginHorizontal: 12 }} />
              <TextInput
                style={{ flex: 1, height: '100%', fontSize: 14, color: '#1A2E1A' }}
                placeholder="10-digit phone number"
                keyboardType="numeric"
                maxLength={10}
                value={resetPhone}
                onChangeText={setResetPhone}
              />
              <TouchableOpacity
                onPress={handleSendResetOtp}
                disabled={sendingOtp}
                style={{ backgroundColor: '#1E5C2E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 }}
                activeOpacity={0.8}
              >
                {sendingOtp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8, fontFamily: FONTS.bold }}>
              Verification OTP
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(30, 92, 46, 0.12)', borderRadius: 12, paddingHorizontal: 16, height: 52, marginBottom: 16 }}>
              <Feather name="shield" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, height: '100%', fontSize: 14, color: '#1A2E1A' }}
                placeholder="Enter 6-digit OTP"
                keyboardType="numeric"
                maxLength={6}
                value={resetOtp}
                onChangeText={setResetOtp}
              />
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8, fontFamily: FONTS.bold }}>
              New 4-Digit MPIN
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(30, 92, 46, 0.12)', borderRadius: 12, paddingHorizontal: 16, height: 52, marginBottom: 24 }}>
              <Feather name="lock" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, height: '100%', fontSize: 14, color: '#1A2E1A' }}
                placeholder="Enter new 4-digit MPIN"
                keyboardType="numeric"
                maxLength={4}
                value={resetNewMpin}
                onChangeText={(text) => setResetNewMpin(text.replace(/[^0-9]/g, ''))}
              />
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#1E5C2E', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' }}
              onPress={handleResetMpinSubmit}
              disabled={resettingMpin}
            >
              {resettingMpin ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', fontFamily: FONTS.bold }}>
                  Reset MPIN
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Dispatch Request Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setCreateModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: Platform.OS === 'ios' ? 34 : 16,
              }}
              onStartShouldSetResponder={() => true}
            >
              <View
                style={{
                  backgroundColor: '#1E5C2E',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONTS.bold }}>
                  Request Stock Dispatch
                </Text>
                <TouchableOpacity
                  onPress={() => setCreateModalVisible(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONTS.bold }}>
                  Commodity *
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 14 }}>
                  <Feather name="package" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, height: '100%', fontSize: 14, color: '#1A2E1A', fontFamily: FONTS.regular }}
                    placeholder="e.g. Potato"
                    value={createCommodity}
                    onChangeText={setCreateCommodity}
                  />
                </View>

                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONTS.bold }}>
                  Number of Bags (Packets) *
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 14 }}>
                  <Feather name="layers" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, height: '100%', fontSize: 14, color: '#1A2E1A', fontFamily: FONTS.regular }}
                    placeholder="e.g. 100"
                    keyboardType="numeric"
                    value={createBags}
                    onChangeText={setCreateBags}
                  />
                </View>

                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONTS.bold }}>
                  Vehicle Number (Optional)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20 }}>
                  <Feather name="truck" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, height: '100%', fontSize: 14, color: '#1A2E1A', fontFamily: FONTS.regular }}
                    placeholder="e.g. RJ01AB1234"
                    value={createVehicle}
                    onChangeText={setCreateVehicle}
                  />
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#1E5C2E',
                    borderRadius: 12,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleCreateDispatch}
                  disabled={submittingCreate}
                  activeOpacity={0.8}
                >
                  {submittingCreate ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 }}>
                      Submit Dispatch Request
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}


