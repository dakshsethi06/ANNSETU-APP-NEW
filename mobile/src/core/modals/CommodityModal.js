import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import commonStyles from '../styles/commonStyles';
import { COLORS } from '../theme/theme';

export default function CommodityModal({ visible, onClose, selectedCommodity, onSelectCommodity }) {
  const commodities = [
    { name: 'Potato', icon: '🥔', translation: 'Aloo' },
    { name: 'Tomato', icon: '🍅', translation: 'Tamatar' },
    { name: 'Ladyfinger', icon: '🫛', translation: 'Bhindi' },
  ];

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
            <Text style={commonStyles.modalTitle}>Select Commodity</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingVertical: 8 }}>
            {commodities.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[
                  commonStyles.stateItem,
                  selectedCommodity === item.name && commonStyles.stateItemSelected,
                  { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
                ]}
                onPress={() => {
                  onSelectCommodity(item.name);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {selectedCommodity === item.name && <View style={commonStyles.activeStripe} />}
                    <View>
                      <Text
                        style={[
                          commonStyles.stateItemText,
                          selectedCommodity === item.name && commonStyles.stateItemTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textLight, fontWeight: '500', marginTop: 2 }}>
                        {item.translation}
                      </Text>
                    </View>
                  </View>
                </View>
                {selectedCommodity === item.name && <Text style={commonStyles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
