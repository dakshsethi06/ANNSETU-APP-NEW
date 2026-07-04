import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import commonStyles from '../../../core/styles/commonStyles';
import styles from '../styles/stockModalStyles';
import { COLORS } from '../../../core/theme/theme';

export default function InventoryModal({ visible, onClose, inventoryList, inventoryLoading }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Facility Inventory / गोदाम इन्वेंटरी</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}><Text style={commonStyles.modalCloseText}>✕</Text></TouchableOpacity>
          </View>

          {inventoryLoading ? <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} /> : (
            <FlatList
              data={inventoryList}
              keyExtractor={(item, index) => (item.lot_id || index.toString()) + index}
              contentContainerStyle={{ padding: 24, gap: 16 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={commonStyles.emptyContainer}><Text style={commonStyles.emptyText}>No crop lots registered in this cold storage.</Text></View>}
              renderItem={({ item }) => {
                const isFresh = (item.status || '').toLowerCase() === 'fresh' || (item.status || '').toLowerCase() === 'stored';
                const badgeBg = isFresh ? '#E8F5E9' : '#E3F2FD';
                const badgeText = isFresh ? '#2E7D32' : '#1565C0';

                return (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.crop} — {item.variety}</Text>
                        <Text style={styles.cardSubtitle}>Location: {item.location} · Lot: {item.lot_id || 'N/A'}</Text>
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
          )}
        </View>
      </View>
    </Modal>
  );
}
