import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BACKEND_URL } from '../../../core/network/config';

export default function ApprovalMpinModal({ visible, onClose, lotId, coldStorageId, onSuccess }) {
  const [mpin, setMpin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!mpin || mpin.length < 4) {
      Alert.alert('Invalid MPIN', 'Please enter your 4-digit MPIN to authorize approval.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/amad/${encodeURIComponent(lotId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coldStorageId: coldStorageId || '7895544442',
          mpin: mpin.trim()
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve booking request');
      }

      Alert.alert('Approved! 🎉', 'Space booking request has been approved. Notification and SMS sent to the farmer.');
      setMpin('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      Alert.alert('Approval Failed', err.message || 'Could not verify MPIN.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <Feather name="shield-check" size={32} color="#1E5C2E" />
          </View>

          <Text style={styles.title}>Confirm Approval</Text>
          <Text style={styles.subtitle}>Enter your 4-digit Cold Storage MPIN to authorize this space booking request.</Text>

          <TextInput
            style={styles.mpinInput}
            value={mpin}
            onChangeText={setMpin}
            placeholder="••••"
            placeholderTextColor="#999"
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
            autoFocus
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Approve & Send SMS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EAF2EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2E1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  mpinInput: {
    width: 140,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#1E5C2E',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#1A2E1A',
    backgroundColor: '#F5F8F5',
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1E5C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
