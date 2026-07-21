import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import commonStyles from '../styles/commonStyles';
import { COLORS } from '../theme/theme';

export default function CommodityModal({ visible, onClose, selectedCommodity, onSelectCommodity }) {
  const { t } = useTranslation();

  const commodities = [
    { id: 'Potato', name: t('commodities.potato.name'), icon: '🥔', translation: t('commodities.potato.sub') },
    { id: 'Tomato', name: t('commodities.tomato.name'), icon: '🍅', translation: t('commodities.tomato.sub') },
    { id: 'Ladyfinger', name: t('commodities.ladyfinger.name'), icon: '🫛', translation: t('commodities.ladyfinger.sub') },
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
            <Text style={commonStyles.modalTitle}>{t('register.search')}</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingVertical: 8 }}>
            {commodities.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  commonStyles.stateItem,
                  selectedCommodity === item.id && commonStyles.stateItemSelected,
                  { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
                ]}
                onPress={() => {
                  onSelectCommodity(item.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {selectedCommodity === item.id && <View style={commonStyles.activeStripe} />}
                    <View>
                      <Text
                        style={[
                          commonStyles.stateItemText,
                          selectedCommodity === item.id && commonStyles.stateItemTextSelected,
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
                {selectedCommodity === item.id && <Text style={commonStyles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
