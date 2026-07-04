import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../../../core/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import commonStyles from '../../../core/styles/commonStyles';
import formStyles from '../styles/formStyles';
import { useRegisterFarmerModal } from '../hooks/useRegisterFarmerModal';

export default function RegisterFarmerModal({ visible, onClose, onRegisterSuccess }) {
  const {
    newFarmerName, setNewFarmerName, newFarmerId, setNewFarmerId, newFarmerState, setNewFarmerState,
    newFarmerCrop, setNewFarmerCrop, newFarmerPhone, setNewFarmerPhone, newFarmerFatherName,
    setNewFarmerFatherName, newFarmerVillage, setNewFarmerVillage, newFarmerDistrict, setNewFarmerDistrict,
    newFarmerTehsil, setNewFarmerTehsil, registerLoading, handleRegisterFarmer
  } = useRegisterFarmerModal(onClose, onRegisterSuccess);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={commonStyles.modalOverlay}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Register New Farmer</Text>
            <TouchableOpacity style={commonStyles.modalCloseBtn} onPress={onClose}><Text style={commonStyles.modalCloseText}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Farmer Name *</Text><TextInput style={formStyles.formInput} placeholder="Enter name" placeholderTextColor={COLORS.textLight} value={newFarmerName} onChangeText={setNewFarmerName} /></View>
            <View style={formStyles.formGroup}>
              <Text style={formStyles.formLabel}>Farmer ID / Serial Number *</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[formStyles.formInput, { flex: 1 }]} placeholder="Enter unique ID" placeholderTextColor={COLORS.textLight} value={newFarmerId} onChangeText={setNewFarmerId} />
                <TouchableOpacity style={formStyles.outlinedActionBtn} onPress={() => setNewFarmerId('f_' + Math.random().toString(36).substring(2, 11))} activeOpacity={0.8}><Text style={formStyles.outlinedActionBtnText}>🔄 Gen</Text></TouchableOpacity>
              </View>
            </View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>State *</Text><TextInput style={formStyles.formInput} placeholder="Enter State" placeholderTextColor={COLORS.textLight} value={newFarmerState} onChangeText={setNewFarmerState} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Primary Crop *</Text><TextInput style={formStyles.formInput} placeholder="Enter Primary Crop" placeholderTextColor={COLORS.textLight} value={newFarmerCrop} onChangeText={setNewFarmerCrop} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Father's Name</Text><TextInput style={formStyles.formInput} placeholder="Enter father's name" placeholderTextColor={COLORS.textLight} value={newFarmerFatherName} onChangeText={setNewFarmerFatherName} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Phone Number</Text><TextInput style={formStyles.formInput} placeholder="Enter phone number" placeholderTextColor={COLORS.textLight} value={newFarmerPhone} onChangeText={setNewFarmerPhone} keyboardType="numeric" /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Village</Text><TextInput style={formStyles.formInput} placeholder="Enter village" placeholderTextColor={COLORS.textLight} value={newFarmerVillage} onChangeText={setNewFarmerVillage} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>Tehsil</Text><TextInput style={formStyles.formInput} placeholder="Enter tehsil" placeholderTextColor={COLORS.textLight} value={newFarmerTehsil} onChangeText={setNewFarmerTehsil} /></View>
            <View style={formStyles.formGroup}><Text style={formStyles.formLabel}>District</Text><TextInput style={formStyles.formInput} placeholder="Enter district" placeholderTextColor={COLORS.textLight} value={newFarmerDistrict} onChangeText={setNewFarmerDistrict} /></View>

            <TouchableOpacity style={formStyles.submitBtn} onPress={handleRegisterFarmer} disabled={registerLoading} activeOpacity={0.85}>
              {!registerLoading && <LinearGradient colors={[COLORS.greenDeep, COLORS.greenMid]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
              {registerLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.submitBtnText}>Register Farmer</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
