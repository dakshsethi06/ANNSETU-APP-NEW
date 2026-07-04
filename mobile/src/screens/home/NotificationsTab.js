import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Platform, StatusBar, ActivityIndicator, Alert, Modal, ScrollView, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../theme';
import { fetchNotifications, markNotificationRead } from '../../services/notificationService';
import { fetchFarmers, BACKEND_URL } from '../../services/api';

export default function NotificationsTab({ farmerId, onBack, onNavigateToTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentDetailVisible, setPaymentDetailVisible] = useState(false);
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [paymentDetailLoading, setPaymentDetailLoading] = useState(false);
  const [activeNotifId, setActiveNotifId] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [fullImageUrl, setFullImageUrl] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const fetchPromise = fetchNotifications(farmerId || 'default_farmer');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network request timeout')), 2000)
      );
      const fetched = await Promise.race([fetchPromise, timeoutPromise]);
      setNotifications(fetched || []);
    } catch (err) {
      console.warn('Error fetching notifications:', err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionPayment = async (notifId, paymentId, action) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/${paymentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action} payment.`);
      }

      Alert.alert(
        action === 'approve' ? 'Payment Approved' : 'Payment Rejected',
        action === 'approve'
          ? 'The payment verification request has been approved successfully.'
          : 'The payment verification request has been rejected.'
      );

      // Close modal and mark notification as read / update list
      setPaymentDetailVisible(false);
      setPaymentDetail(null);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      loadNotifications();
    } catch (err) {
      console.warn(`Payment ${action} failed:`, err.message);
      Alert.alert('Error', err.message || `Failed to ${action} payment.`);
    }
  };

  const handleOpenPaymentDetail = async (item) => {
    if (!item.actionUrl) return;
    const paymentId = item.actionUrl.split('/').pop();
    setActiveNotifId(item.id);
    setPaymentDetailLoading(true);
    setPaymentDetailVisible(true);
    setPaymentDetail(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/${paymentId}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch payment details.');
      }
      setPaymentDetail(data.payment);
    } catch (err) {
      console.warn('Failed to fetch payment details:', err.message);
      Alert.alert('Error', err.message);
      setPaymentDetailVisible(false);
    } finally {
      setPaymentDetailLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(async () => {
      try {
        const fetched = await fetchNotifications(farmerId || 'default_farmer');
        setNotifications(fetched || []);
      } catch (err) {
        console.warn('Silent NotificationsTab poll failed:', err.message);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [farmerId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const renderNotificationCard = ({ item }) => {
    let iconName = 'bell';
    let iconColor = '#0284C7';
    let iconBg = '#E0F2FE';

    if (item.type === 'aging' || item.title.toLowerCase().includes('aging')) {
      iconName = 'alert-triangle';
      iconColor = '#D97706';
      iconBg = '#FEF3C7';
    } else if (item.type === 'billing' || item.title.toLowerCase().includes('payment') || item.title.toLowerCase().includes('due')) {
      iconName = 'wallet-outline';
      iconColor = '#DC2626';
      iconBg = '#FEE2E2';
    } else if (item.title.toLowerCase().includes('approval') || item.title.toLowerCase().includes('authorize') || item.type === 'warning') {
      iconName = 'lock';
      iconColor = '#F59E0B';
      iconBg = '#FFFBEB';
    }

    const isUnread = !item.isRead;
    const isPaymentVerification = item.title === 'Payment Verification Required';

    const handlePressNotification = async () => {
      if (isPaymentVerification) {
        handleOpenPaymentDetail(item);
        return;
      }

      setNotifications(prev =>
        prev.map(n => n.id === item.id ? { ...n, isRead: true } : n)
      );
      await markNotificationRead(item.id);

      if (onNavigateToTab && (
        item.title.toLowerCase().includes('approval') ||
        item.title.toLowerCase().includes('authorize') ||
        item.title.toLowerCase().includes('delivered') ||
        item.title.toLowerCase().includes('dispatch')
      )) {
        onNavigateToTab('dispatch');
      }
    };

    return (
      <TouchableOpacity
        style={s.card}
        onPress={handlePressNotification}
        activeOpacity={0.7}
      >
        <View style={s.cardContent}>
          <View style={s.cardLeft}>
            <View style={[s.unreadDot, { opacity: isUnread ? 1 : 0 }]} />
            <View style={[s.iconBadge, { backgroundColor: iconBg }]}>
              {iconName === 'wallet-outline' ? (
                <Ionicons name="wallet-outline" size={18} color={iconColor} />
              ) : (
                <Feather name={iconName} size={18} color={iconColor} />
              )}
            </View>
          </View>

          <View style={s.cardRight}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.timeLabel}>{item.timeLabel}</Text>
            </View>
            <Text style={s.messageText}>{item.message}</Text>

            {isPaymentVerification && (
              <View style={s.tapToViewRow}>
                <Feather name="eye" size={13} color="#2D6A4F" style={{ marginRight: 6 }} />
                <Text style={s.tapToViewText}>Tap to view details</Text>
                <Feather name="chevron-right" size={14} color="#2D6A4F" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safeArea}>
      {Platform.OS === 'android' && (
        <View style={{ height: StatusBar.currentHeight, backgroundColor: '#F5F3EE' }} />
      )}

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color="#1E5C2E" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
      </View>

      <View style={s.divider} />

      <View style={s.container}>
        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator size="large" color="#1E5C2E" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationCard}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Feather name="bell-off" size={48} color="#A1A1AA" />
                <Text style={s.emptyText}>No notifications yet</Text>
              </View>
            }
          />
        )}
      </View>

      {/* ─── Payment Verification Detail Modal ─── */}
      <Modal
        visible={paymentDetailVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setPaymentDetailVisible(false);
          setPaymentDetail(null);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <TouchableOpacity
                style={s.modalBackBtn}
                onPress={() => {
                  setPaymentDetailVisible(false);
                  setPaymentDetail(null);
                }}
                activeOpacity={0.8}
              >
                <Feather name="arrow-left" size={20} color="#1E5C2E" />
              </TouchableOpacity>
              <Text style={s.modalHeaderTitle}>Payment Verification</Text>
            </View>

            <View style={s.divider} />

            {paymentDetailLoading ? (
              <View style={s.modalLoader}>
                <ActivityIndicator size="large" color="#1E5C2E" />
                <Text style={{ marginTop: 12, color: '#71717A', fontFamily: FONTS.regular }}>Loading payment details...</Text>
              </View>
            ) : paymentDetail ? (
              <ScrollView contentContainerStyle={s.modalScrollContent} showsVerticalScrollIndicator={false}>
                {/* Status Badge */}
                <View style={s.statusRow}>
                  <View style={s.statusBadge}>
                    <Feather name="clock" size={13} color="#B45309" style={{ marginRight: 6 }} />
                    <Text style={s.statusBadgeText}>Pending Verification</Text>
                  </View>
                </View>

                {/* Transaction Details Card */}
                <View style={s.detailCard}>
                  <Text style={s.detailCardTitle}>Transaction Details</Text>

                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Farmer Name</Text>
                    <Text style={s.detailValue}>{paymentDetail.farmerName}</Text>
                  </View>

                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Farmer Phone</Text>
                    <Text style={s.detailValue}>{paymentDetail.farmerPhone || 'N/A'}</Text>
                  </View>

                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Payment ID</Text>
                    <Text style={s.detailValue}>{paymentDetail.id}</Text>
                  </View>

                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>UTR / Transaction Reference</Text>
                    <Text style={[s.detailValue, { color: '#1E5C2E', fontWeight: '800' }]}>{paymentDetail.reference || 'N/A'}</Text>
                  </View>

                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Payment Amount</Text>
                    <Text style={[s.detailValue, { color: '#DC2626', fontSize: 18 }]}>{'\u20B9'}{parseFloat(paymentDetail.amount).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Payment Mode</Text>
                    <Text style={s.detailValue}>{paymentDetail.paymentMode || 'Online'}</Text>
                  </View>

                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Date of Payment</Text>
                    <Text style={s.detailValue}>{formatDate(paymentDetail.createdAt)}</Text>
                  </View>

                  <View style={[s.detailItem, { borderBottomWidth: 0 }]}>
                    <Text style={s.detailLabel}>Receipt File</Text>
                    {paymentDetail.receiptFile ? (
                      <TouchableOpacity
                        style={s.receiptFileRow}
                        activeOpacity={0.7}
                        onPress={() => {
                          const url = paymentDetail.receiptFile;
                          if (url.startsWith('http')) {
                            setFullImageUrl(url);
                            setImageModalVisible(true);
                          } else {
                            Alert.alert('Receipt', `File: ${url}\n\nThis receipt was saved locally on the farmer\'s device.`);
                          }
                        }}
                      >
                        <Feather name="file-text" size={16} color="#1E4032" style={{ marginRight: 8 }} />
                        <Text style={[s.detailValue, { color: '#2D6A4F', flex: 1 }]} numberOfLines={1}>
                          {paymentDetail.receiptFile.startsWith('http') ? 'View Receipt / रसीद देखें' : paymentDetail.receiptFile}
                        </Text>
                        <Feather name="external-link" size={14} color="#2D6A4F" />
                      </TouchableOpacity>
                    ) : (
                      <Text style={[s.detailValue, { color: '#A1A1AA' }]}>No receipt uploaded</Text>
                    )}
                  </View>
                </View>

                {/* Approve / Reject Buttons */}
                <View style={s.modalActionRow}>
                  <TouchableOpacity
                    style={s.modalApproveBtn}
                    onPress={() => handleActionPayment(activeNotifId, paymentDetail.id, 'approve')}
                    activeOpacity={0.8}
                  >
                    <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={s.modalActionBtnText}>Approve Payment</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.modalRejectBtn}
                    onPress={() => handleActionPayment(activeNotifId, paymentDetail.id, 'reject')}
                    activeOpacity={0.8}
                  >
                    <Feather name="x-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={s.modalActionBtnText}>Reject Payment</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ─── Fullscreen Image Viewer Modal ─── */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setImageModalVisible(false);
          setFullImageUrl('');
        }}
      >
        <View style={s.imageModalOverlay}>
          <TouchableOpacity
            style={s.imageModalCloseBtn}
            onPress={() => {
              setImageModalVisible(false);
              setFullImageUrl('');
            }}
            activeOpacity={0.8}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {fullImageUrl ? (
            <Image
              source={{ uri: fullImageUrl }}
              style={s.fullSizeImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3EE',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 92, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E2D9',
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E2D9',
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E5C2E',
    marginRight: 8,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRight: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.bold,
    flex: 1,
    marginRight: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  messageText: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 4,
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  tapToViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3EFE3',
  },
  tapToViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D6A4F',
    flex: 1,
    fontFamily: FONTS.bold,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 12,
    fontFamily: FONTS.regular,
  },

  // ─── Payment Detail Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 64, 50, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F5F3EE',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3EE',
  },
  modalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 92, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  modalLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusRow: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: FONTS.bold,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E4032',
    marginBottom: 16,
    fontFamily: FONTS.bold,
  },
  detailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE3',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontFamily: FONTS.bold,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: FONTS.bold,
  },
  receiptFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  modalActionRow: {
    gap: 12,
  },
  modalApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImage: {
    width: '100%',
    height: '85%',
  },
});
