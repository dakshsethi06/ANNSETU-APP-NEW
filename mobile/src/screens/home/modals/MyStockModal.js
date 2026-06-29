import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import commonStyles from '../styles/commonStyles';
import styles from '../styles/stockModalStyles';

export default function MyStockModal({ visible, onClose, holdingsList }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>My Stored Crops / मेरी फसलें</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}><Text style={commonStyles.modalCloseText}>✕</Text></TouchableOpacity>
          </View>

          <FlatList
            data={holdingsList}
            keyExtractor={(item, index) => (item.lot_id || index.toString()) + index}
            contentContainerStyle={{ padding: 24, gap: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<View style={commonStyles.emptyContainer}><Text style={commonStyles.emptyText}>No crop stock registered for this farmer.</Text></View>}
            renderItem={({ item }) => {
              const isFresh = (item.status || '').toLowerCase() === 'fresh' || (item.status || '').toLowerCase() === 'stored';
              const badgeBg = isFresh ? '#E8F5E9' : '#E3F2FD';
              const badgeText = isFresh ? '#2E7D32' : '#1565C0';

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.crop} — {item.variety}</Text>
                      <Text style={styles.cardSubtitle}>🏢 {item.cold_storage} · Location: {item.location}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badgeBg }]}><Text style={[styles.badgeText, { color: badgeText }]}>{item.status || 'Stored'}</Text></View>
                  </View>

                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}><Text style={styles.metaLabel}>Bags</Text><Text style={styles.metaValue}>{item.bags}</Text></View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}><Text style={styles.metaLabel}>Weight</Text><Text style={styles.metaValue}>{item.weight}</Text></View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}><Text style={styles.metaLabel}>Storage Age</Text><Text style={styles.metaValue}>{item.inbound_age || `${item.age_days}d`}</Text></View>
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
