import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

export default function SuccessModal({ visible, lang, onClose, title, message }) {
  const defaultTitle = lang === 'en' ? 'Submitted' : 'जमा हो गया';
  const defaultMsg = lang === 'en'
    ? 'Thank you! Your payment details have been submitted. Verification is in progress.'
    : 'धन्यवाद! आपके भुगतान का विवरण जमा कर दिया गया है। सत्यापन प्रगति पर है।';

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
            <Text style={styles.modalButtonTextPrimary}>{lang === 'en' ? 'OK' : 'ठीक है'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
