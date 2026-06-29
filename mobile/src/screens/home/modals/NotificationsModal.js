import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import commonStyles from '../styles/commonStyles';
import styles from '../styles/notificationModalStyles';

export default function NotificationsModal({ visible, onClose, notifications }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={[commonStyles.modalContainer, { backgroundColor: '#F9F8F3' }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.8}><Feather name="arrow-left" size={22} color="#1B4332" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<View style={commonStyles.emptyContainer}><Text style={commonStyles.emptyText}>No notifications found.</Text></View>}
            renderItem={({ item }) => {
              const isWarning = item.type === 'warning';
              const iconBg = isWarning ? '#FFFDF4' : '#FFEBEB';
              const iconColor = isWarning ? '#E28743' : '#E53E3E';

              return (
                <View style={styles.card}>
                  <View style={styles.leftRow}>
                    <View style={[styles.unreadDot, { backgroundColor: item.isRead ? 'transparent' : '#1B4332' }]} />
                    <View style={[styles.iconContainer, { backgroundColor: iconBg, borderColor: isWarning ? '#FFF4D0' : '#FFD2D2' }]}>
                      <Feather name={isWarning ? 'alert-triangle' : 'wallet'} size={20} color={iconColor} />
                    </View>
                  </View>
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
