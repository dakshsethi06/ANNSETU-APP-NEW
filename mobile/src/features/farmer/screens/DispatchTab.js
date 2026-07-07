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

  // Reset MPIN states
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewMpin, setResetNewMpin] = useState('');
  const [resettingMpin, setResettingMpin] = useState(false);

  const handleResetMpinSubmit = async () => {
    if (resetPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (resetOtp !== '1234') {
      Alert.alert('Error', 'Invalid verification OTP. Please use "1234" to verify.');
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
        <View style={{ width: 40 }} />
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
              const formattedDate = new Date(item.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              });

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
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() => handleApprovePress(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="lock" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={s.approveBtnText}>Approve via MPIN</Text>
                    </TouchableOpacity>
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
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8, fontFamily: FONTS.bold }}>
              Verification OTP
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(30, 92, 46, 0.12)', borderRadius: 12, paddingHorizontal: 16, height: 52, marginBottom: 16 }}>
              <Feather name="shield" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, height: '100%', fontSize: 14, color: '#1A2E1A' }}
                placeholder="Enter 1234 to verify"
                keyboardType="numeric"
                maxLength={4}
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
    </View>
  );
}


