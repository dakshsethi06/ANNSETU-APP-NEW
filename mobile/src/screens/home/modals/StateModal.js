import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { fetchStates } from '../../../services/api';
import commonStyles from '../styles/commonStyles';
import { COLORS } from '../../../theme';

export default function StateModal({ visible, onClose, selectedState, onSelectState }) {
  const [statesList, setStatesList] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  useEffect(() => {
    if (visible && statesList.length === 0) {
      loadStates();
    }
  }, [visible]);

  const loadStates = async () => {
    setStatesLoading(true);
    try {
      const list = await fetchStates();
      setStatesList(list || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load states.');
    } finally {
      setStatesLoading(false);
    }
  };

  const filteredStates = statesList.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

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
            <Text style={commonStyles.modalTitle}>Select State</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={commonStyles.modalSearchContainer}>
            <Text style={commonStyles.modalSearchIcon}>🔍</Text>
            <TextInput
              style={commonStyles.modalSearchInput}
              placeholder="Search states…"
              placeholderTextColor={COLORS.textLight}
              value={stateSearch}
              onChangeText={setStateSearch}
              autoCorrect={false}
            />
          </View>

          {statesLoading ? (
            <View style={commonStyles.modalLoading}>
              <ActivityIndicator size="large" color={COLORS.greenDeep} />
              <Text style={commonStyles.loadingText}>Loading states…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={commonStyles.separator} />}
              ListEmptyComponent={
                <View style={commonStyles.emptyContainer}>
                  <Text style={commonStyles.emptyText}>
                    No states found matching "{stateSearch}"
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    commonStyles.stateItem,
                    selectedState === item && commonStyles.stateItemSelected,
                  ]}
                  onPress={() => {
                    onSelectState(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {selectedState === item && <View style={commonStyles.activeStripe} />}
                    <Text
                      style={[
                        commonStyles.stateItemText,
                        selectedState === item && commonStyles.stateItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                  {selectedState === item && <Text style={commonStyles.checkMark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
