import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import commonStyles from '../styles/commonStyles';

export default function MyStockModal({ visible, onClose, holdingsList }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>My Stored Crops / मेरी फसलें</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={holdingsList}
            keyExtractor={(item, index) => (item.lot_id || index.toString()) + index}
            contentContainerStyle={{ padding: 24, gap: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={commonStyles.emptyContainer}>
                <Text style={commonStyles.emptyText}>No crop stock registered for this farmer.</Text>
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
                      <Text style={styles.cardSubtitle}>🏢 {item.cold_storage} · Location: {item.location}</Text>
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
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#7A7A7A',
    marginTop: 2,
    fontWeight: '500',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F3',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0EBE0',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#EAD9B0',
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7A7A7A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E4032',
    marginTop: 2,
  },
});
