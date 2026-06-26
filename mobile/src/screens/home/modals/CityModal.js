import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import commonStyles from '../styles/commonStyles';
import { COLORS } from '../../../theme';

export default function CityModal({ visible, onClose, selectedCity, onSelectCity, citiesList, citiesLoading }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Select City / Market</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {citiesLoading ? (
            <View style={commonStyles.modalLoading}>
              <ActivityIndicator size="large" color={COLORS.greenDeep} />
              <Text style={commonStyles.loadingText}>Loading markets…</Text>
            </View>
          ) : (
            <FlatList
              data={citiesList}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={commonStyles.separator} />}
              ListEmptyComponent={
                <View style={commonStyles.emptyContainer}>
                  <Text style={commonStyles.emptyText}>No markets found for this state.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    commonStyles.stateItem,
                    selectedCity === item && commonStyles.stateItemSelected,
                  ]}
                  onPress={() => {
                    onSelectCity(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {selectedCity === item && <View style={commonStyles.activeStripe} />}
                    <Text
                      style={[
                        commonStyles.stateItemText,
                        selectedCity === item && commonStyles.stateItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                  {selectedCity === item && <Text style={commonStyles.checkMark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
