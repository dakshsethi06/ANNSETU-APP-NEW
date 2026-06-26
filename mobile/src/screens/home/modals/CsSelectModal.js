import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import commonStyles from '../styles/commonStyles';
import { COLORS } from '../../../theme';

export default function CsSelectModal({
  visible,
  onClose,
  coldStoragesList,
  coldStoragesLoading,
  selectedColdStorageId,
  onSelectColdStorage,
  onRegisterNew,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Select Cold Storage</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {coldStoragesLoading ? (
            <View style={commonStyles.modalLoading}>
              <ActivityIndicator size="large" color={COLORS.greenDeep} />
              <Text style={commonStyles.loadingText}>Loading facilities…</Text>
            </View>
          ) : (
            <FlatList
              data={coldStoragesList}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={commonStyles.separator} />}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[commonStyles.stateItem, { backgroundColor: '#EAD9B0', justifyContent: 'center', paddingVertical: 14 }]}
                  onPress={() => {
                    onClose();
                    onRegisterNew();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontWeight: '700', color: COLORS.greenDeep }}>➕ Register New Storage</Text>
                </TouchableOpacity>
              }
              ListEmptyComponent={
                <View style={commonStyles.emptyContainer}>
                  <Text style={commonStyles.emptyText}>No cold storages found in database.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[commonStyles.stateItem, selectedColdStorageId === item.id && commonStyles.stateItemSelected, { paddingVertical: 16 }]}
                  onPress={() => {
                    onSelectColdStorage(item.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {selectedColdStorageId === item.id && <View style={commonStyles.activeStripe} />}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          commonStyles.stateItemText,
                          selectedColdStorageId === item.id && commonStyles.stateItemTextSelected,
                          { fontWeight: '700' },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>
                        📍 {item.city}, {item.district}, {item.state}
                      </Text>
                    </View>
                  </View>
                  {selectedColdStorageId === item.id && <Text style={commonStyles.checkMark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
