import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Modal, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS } from '../../theme';
import { BACKEND_URL } from '../../services/api';

export default function DispatchTab({ farmerId, onBackPress }) {
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
        <Text style={s.headerTitle}>Dispatch / निकासी</Text>
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
              <Text style={s.emptyText}>No dispatch entries found / कोई निकासी प्रविष्टि नहीं मिली</Text>
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
                      <Text style={s.transitText}>In Transit / मार्ग में</Text>
                    </View>
                  )}

                  {item.status === 'DISPATCHED' && (
                    <View style={s.deliveredRow}>
                      <Feather name="check-circle" size={14} color="#047857" style={{ marginRight: 6 }} />
                      <Text style={s.deliveredText}>Delivered & confirmed</Text>
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

const s = StyleSheet.create({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    paddingVertical: 12,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 12,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F4F4F5',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idBadge: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  idText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: '#71717A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  weightText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#18181B',
  },
  dateText: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
    color: '#18181B',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
    marginBottom: 12,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  vehicleText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: '#18181B',
  },
  approveBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  deliveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveredText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transitText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    backgroundColor: '#1E5C2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  modalBody: {
    padding: 20,
  },
  calloutBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    fontFamily: FONTS.bold,
  },
  calloutSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  otpInstructions: {
    fontSize: 13,
    color: '#71717A',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  otpInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    gap: 8,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 2,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  otpBoxActive: {
    borderColor: '#1E5C2E',
  },
  otpCharText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  hiddenInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
  },
  submitBtn: {
    backgroundColor: '#1E5C2E',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...SHADOWS.sm,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
});
