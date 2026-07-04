import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../../../core/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import commonStyles from '../../../core/styles/commonStyles';
import formStyles from '../../farmer/styles/formStyles';
import { useCsRegisterModal } from '../hooks/useCsRegisterModal';

export default function CsRegisterModal({ visible, onClose, onRegisterSuccess }) {
  const {
    newCsName, setNewCsName, newCsCity, setNewCsCity, newCsDistrict, setNewCsDistrict,
    newCsState, setNewCsState, newCsAddress, setNewCsAddress, newCsContactPerson,
    setNewCsContactPerson, newCsPhone, setNewCsPhone, csRegisterLoading, handleRegisterColdStorage
  } = useCsRegisterModal(onClose, onRegisterSuccess);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Register Cold Storage</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}><Text style={commonStyles.modalCloseText}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Storage Name *</Text><TextInput style={formStyles.formInput} placeholder="Enter storage name (e.g. Balaji CS)" placeholderTextColor={COLORS.textLight} value={newCsName} onChangeText={setNewCsName} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>City</Text><TextInput style={formStyles.formInput} placeholder="Enter City (default: Tundla)" placeholderTextColor={COLORS.textLight} value={newCsCity} onChangeText={setNewCsCity} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>District</Text><TextInput style={formStyles.formInput} placeholder="Enter District (default: Firozabad)" placeholderTextColor={COLORS.textLight} value={newCsDistrict} onChangeText={setNewCsDistrict} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>State</Text><TextInput style={formStyles.formInput} placeholder="Enter State (default: Uttar Pradesh)" placeholderTextColor={COLORS.textLight} value={newCsState} onChangeText={setNewCsState} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Full Address</Text><TextInput style={formStyles.formInput} placeholder="Enter full address" placeholderTextColor={COLORS.textLight} value={newCsAddress} onChangeText={setNewCsAddress} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Contact Person</Text><TextInput style={formStyles.formInput} placeholder="Enter contact person" placeholderTextColor={COLORS.textLight} value={newCsContactPerson} onChangeText={setNewCsContactPerson} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Phone Number</Text><TextInput style={formStyles.formInput} placeholder="Enter phone number" placeholderTextColor={COLORS.textLight} value={newCsPhone} onChangeText={setNewCsPhone} keyboardType="numeric" /></View>

            <TouchableOpacity style={formStyles.submitBtn} onPress={handleRegisterColdStorage} disabled={csRegisterLoading} activeOpacity={0.85}>
              {!csRegisterLoading && <LinearGradient colors={[COLORS.greenDeep, COLORS.greenMid]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
              {csRegisterLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.submitBtnText}>Register Storage</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
