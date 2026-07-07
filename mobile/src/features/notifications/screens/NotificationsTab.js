import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Platform, StatusBar, ActivityIndicator, Alert, Modal, ScrollView, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FONTS } from '../../../core/theme/theme';
import s from '../styles/notificationsTabStyles';
import { fetchNotifications, markNotificationRead } from '../services/notificationService';
import { fetchFarmers } from '../../farmer/services/farmerService';
import { BACKEND_URL } from '../../../core/network/api';

export default function NotificationsTab({ farmerId, onBack, onNavigateToTab, onMarkRead }) {
  const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentDetailVisible, setPaymentDetailVisible] = useState(false);
    const [paymentDetail, setPaymentDetail] = useState(null);
    const [paymentDetailLoading, setPaymentDetailLoading] = useState(false);
    const [activeNotifId, setActiveNotifId] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [fullImageUrl, setFullImageUrl] = useState('');
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

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
        if (onMarkRead) {
          onMarkRead();
        }
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

        setNotifications(prev => prev.filter(n => n.id !== item.id));
        await markNotificationRead(item.id);
        if (onMarkRead) {
          onMarkRead();
        }

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
                            {paymentDetail.receiptFile.startsWith('http') ? t('notifications.view_receipt') : paymentDetail.receiptFile}
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
            setImageError(false);
          }}
        >
          <View style={s.imageModalOverlay}>
            <TouchableOpacity
              style={s.imageModalCloseBtn}
              onPress={() => {
                setImageModalVisible(false);
                setFullImageUrl('');
                setImageError(false);
              }}
              activeOpacity={0.8}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {fullImageUrl ? (
              <View style={{ width: '100%', height: '85%', justifyContent: 'center', alignItems: 'center' }}>
                <Image
                  source={{ uri: fullImageUrl }}
                  style={s.fullSizeImage}
                  resizeMode="contain"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
                {imageLoading && (
                  <ActivityIndicator size="large" color="#FFFFFF" style={{ position: 'absolute' }} />
                )}
                {imageError && (
                  <View style={{ position: 'absolute', alignItems: 'center', paddingHorizontal: 20 }}>
                    <Feather name="image" size={48} color="#A1A1AA" style={{ marginBottom: 12 }} />
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: FONTS.medium, textAlign: 'center' }}>
                      {t('notifications.failed_load_receipt_image')}
                    </Text>
                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                      {fullImageUrl}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }


