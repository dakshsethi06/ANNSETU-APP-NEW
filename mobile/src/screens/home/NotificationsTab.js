import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../theme';
import { fetchNotifications, markNotificationRead } from '../../services/notificationService';
import { fetchFarmers } from '../../services/api';

export default function NotificationsTab({ farmerId, onBack, onNavigateToTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Setup a 2-second timeout promise to race against the network fetch
      const fetchPromise = fetchNotifications(farmerId || 'default_farmer');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network request timeout')), 2000)
      );

      // Race the API fetch against the timeout limit
      const fetched = await Promise.race([fetchPromise, timeoutPromise]);
      setNotifications(fetched || []);
    } catch (err) {
      console.warn('Error fetching notifications:', err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
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

  const renderNotificationCard = ({ item }) => {
    let iconName = 'bell';
    let iconColor = '#0284C7'; // Info blue
    let iconBg = '#E0F2FE';

    if (item.type === 'aging' || item.title.toLowerCase().includes('aging')) {
      iconName = 'alert-triangle';
      iconColor = '#D97706'; // Warning orange
      iconBg = '#FEF3C7';
    } else if (item.type === 'billing' || item.title.toLowerCase().includes('payment') || item.title.toLowerCase().includes('due')) {
      iconName = 'wallet-outline';
      iconColor = '#DC2626'; // Error red
      iconBg = '#FEE2E2';
    } else if (item.title.toLowerCase().includes('approval') || item.title.toLowerCase().includes('authorize') || item.type === 'warning') {
      iconName = 'lock';
      iconColor = '#F59E0B'; // Lock orange
      iconBg = '#FFFBEB';
    }

    const isUnread = !item.isRead;

    const handlePressNotification = async () => {
      // 1. Instantly mark as read in local state (green dot goes away)
      setNotifications(prev =>
        prev.map(n => n.id === item.id ? { ...n, isRead: true } : n)
      );

      // 2. Send read request to the backend
      await markNotificationRead(item.id);

      // 3. Navigate if needed
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
          {/* Left Column: Unread dot + Icon Badge */}
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

          {/* Right Column: Message Detail */}
          <View style={s.cardRight}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.timeLabel}>{item.timeLabel}</Text>
            </View>
            <Text style={s.messageText}>{item.message}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safeArea}>
      {/* Status Bar Spacer for Android */}
      {Platform.OS === 'android' && (
        <View style={{ height: StatusBar.currentHeight, backgroundColor: '#F5F3EE' }} />
      )}

      {/* Header Bar */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color="#1E5C2E" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
      </View>

      <View style={s.divider} />

      {/* Main Notifications Content List */}
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
});
