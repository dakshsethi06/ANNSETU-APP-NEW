import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import commonStyles from '../styles/commonStyles';
import { useAmadModal } from '../../../hooks/useAmadModal';
import AmadModalForm from './AmadModalForm';

export default function AmadModal({ visible, onClose, dbFarmers, defaultFarmerId, onAmadSuccess }) {
  const hookProps = useAmadModal(visible, defaultFarmerId, onClose, onAmadSuccess);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Add Amad Lot Entry</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <AmadModalForm dbFarmers={dbFarmers} {...hookProps} />
        </View>
      </View>
    </Modal>
  );
}
