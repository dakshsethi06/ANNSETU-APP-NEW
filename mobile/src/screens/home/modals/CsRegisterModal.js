import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { addColdStorage } from '../../../services/api';
import { COLORS } from '../../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import commonStyles from '../styles/commonStyles';

export default function CsRegisterModal({ visible, onClose, onRegisterSuccess }) {
  const [newCsName, setNewCsName] = useState('');
  const [newCsCity, setNewCsCity] = useState('');
  const [newCsDistrict, setNewCsDistrict] = useState('');
  const [newCsState, setNewCsState] = useState('');
  const [newCsAddress, setNewCsAddress] = useState('');
  const [newCsContactPerson, setNewCsContactPerson] = useState('');
  const [newCsPhone, setNewCsPhone] = useState('');
  const [csRegisterLoading, setCsRegisterLoading] = useState(false);

  const handleRegisterColdStorage = async () => {
    if (!newCsName.trim()) {
      Alert.alert('Error', 'Storage Name is required.');
      return;
    }
    setCsRegisterLoading(true);
    try {
      const storageId = 'cs_' + Math.random().toString(36).substring(2, 11);
      const csData = {
        id: storageId,
        displayName: newCsName.trim(),
        city: newCsCity.trim() || 'Tundla',
        district: newCsDistrict.trim() || 'Firozabad',
        state: newCsState.trim() || 'Uttar Pradesh',
        address: newCsAddress.trim() || undefined,
        contactPerson: newCsContactPerson.trim() || undefined,
        phone: newCsPhone.trim() || undefined,
      };
      await addColdStorage(csData);
      Alert.alert('Success', `Cold Storage "${newCsName}" registered successfully!`);
      // Reset form
      setNewCsName('');
      setNewCsCity('');
      setNewCsDistrict('');
      setNewCsState('');
      setNewCsAddress('');
      setNewCsContactPerson('');
      setNewCsPhone('');
      onRegisterSuccess(storageId);
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register cold storage');
    } finally {
      setCsRegisterLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Register Cold Storage</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}>
              <Text style={commonStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Storage Name *</Text>
              <TextInput style={styles.formInput} placeholder="Enter storage name (e.g. Balaji CS)" placeholderTextColor={COLORS.textLight} value={newCsName} onChangeText={setNewCsName} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>City</Text>
              <TextInput style={styles.formInput} placeholder="Enter City (default: Tundla)" placeholderTextColor={COLORS.textLight} value={newCsCity} onChangeText={setNewCsCity} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>District</Text>
              <TextInput style={styles.formInput} placeholder="Enter District (default: Firozabad)" placeholderTextColor={COLORS.textLight} value={newCsDistrict} onChangeText={setNewCsDistrict} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>State</Text>
              <TextInput style={styles.formInput} placeholder="Enter State (default: Uttar Pradesh)" placeholderTextColor={COLORS.textLight} value={newCsState} onChangeText={setNewCsState} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Address</Text>
              <TextInput style={styles.formInput} placeholder="Enter full address" placeholderTextColor={COLORS.textLight} value={newCsAddress} onChangeText={setNewCsAddress} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contact Person</Text>
              <TextInput style={styles.formInput} placeholder="Enter contact person" placeholderTextColor={COLORS.textLight} value={newCsContactPerson} onChangeText={setNewCsContactPerson} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <TextInput style={styles.formInput} placeholder="Enter phone number" placeholderTextColor={COLORS.textLight} value={newCsPhone} onChangeText={setNewCsPhone} keyboardType="numeric" />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleRegisterColdStorage} disabled={csRegisterLoading} activeOpacity={0.85}>
              {!csRegisterLoading && (
                <LinearGradient colors={[COLORS.greenDeep, COLORS.greenMid]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              )}
              {csRegisterLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Register Storage</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    width: '100%',
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDeep,
  },
  formInput: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#EAD9B0',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    color: COLORS.textDark,
    fontSize: 14,
  },
  submitBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
    backgroundColor: '#CCCCCC',
    overflow: 'hidden',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
