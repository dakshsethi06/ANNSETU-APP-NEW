import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import commonStyles from '../styles/commonStyles';
import { COLORS } from '../../../theme';

export default function InventoryModal({ visible, onClose, inventoryList, inventoryLoading }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Facility Inventory / गोदाम इन्वेंटरी</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {inventoryLoading ? (
            <ActivityIndicator size="large" color={COLORS.greenDeep} style={{ marginVertical: 40 }} />
          ) : (
            <FlatList
              data={inventoryList}
              keyExtractor={(item, index) => (item.lot_id || index.toString()) + index}
              contentContainerStyle={{ padding: 24, gap: 16 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={commonStyles.emptyContainer}>
                  <Text style={commonStyles.emptyText}>No crop lots registered in this cold storage.</Text>
                </View>
              }
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
                      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.badgeText, { color: badgeText }]}>{item.status || 'Stored'}</Text>
                      </View>
                    </View>

                    <View style={styles.metaGrid}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Bags</Text>
                        <Text style={styles.metaValue}>{item.bags}</Text>
                      </View>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Weight</Text>
                        <Text style={styles.metaValue}>{item.weight}</Text>
                      </View>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Storage Age</Text>
                        <Text style={styles.metaValue}>{item.inbound_age || `${item.age_days}d`}</Text>
                      </View>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    shadowColor: '#1E4032',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#7A7A7A',
    marginTop: 2,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F3',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F0EBE0',
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#EAD9B0',
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#7A7A7A',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E4032',
    marginTop: 2,
  },
});
