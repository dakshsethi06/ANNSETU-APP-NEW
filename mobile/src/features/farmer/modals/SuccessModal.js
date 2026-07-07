import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import styles from '../styles/khataTabStyles';

export default function SuccessModal({ visible, onClose, title, message }) {
  const { t } = useTranslation();
  const defaultTitle = t('khata.submitted');
  const defaultMsg = t('khata.thank_you_verification');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Feather name="check-circle" size={48} color="#16A34A" style={{ marginBottom: 16 }} />
          <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 12 }]}>
            {title || defaultTitle}
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#4B5563',
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 20,
          }}>
            {message || defaultMsg}
          </Text>
          <TouchableOpacity
            style={styles.modalButtonPrimary}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.modalButtonTextPrimary}>{t('khata.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
