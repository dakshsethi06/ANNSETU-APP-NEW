import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import commonStyles from '../styles/commonStyles';
import { COLORS } from '../../../theme';

export default function NotificationsModal({ visible, onClose, notifications }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={[commonStyles.modalContainer, { backgroundColor: '#F9F8F3' }]}>
          {/* Top Bar with circular Back Button */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.8}>
              <Feather name="arrow-left" size={22} color="#1B4332" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, pb: 40, gap: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={commonStyles.emptyContainer}>
                <Text style={commonStyles.emptyText}>No notifications found.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isWarning = item.type === 'warning';
              const iconBg = isWarning ? '#FFFDF4' : '#FFEBEB';
              const iconColor = isWarning ? '#E28743' : '#E53E3E';

              return (
                <View style={styles.card}>
                  <View style={styles.leftRow}>
                    {/* Unread Indicator Dot */}
                    <View style={[styles.unreadDot, { backgroundColor: item.isRead ? 'transparent' : '#1B4332' }]} />
                    
                    {/* Circle Icon Container */}
                    <View style={[styles.iconContainer, { backgroundColor: iconBg, borderColor: isWarning ? '#FFF4D0' : '#FFD2D2' }]}>
                      <Feather name={isWarning ? 'alert-triangle' : 'wallet'} size={20} color={iconColor} />
                    </View>
                  </View>

                  {/* Message details */}
                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.timeText}>{item.timeLabel || '1d ago'}</Text>
                    </View>
                    <Text style={styles.messageText}>{item.message}</Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2DEC6',
    backgroundColor: '#F9F8F3',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E5D3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B4332',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B4332',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7E2D0',
    alignItems: 'center',
    shadowColor: '#1E4032',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
  },
  timeText: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
  },
});
