import React, { useState, useEffect } from 'react';
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
import { addAmad } from '../../../services/api';
import { COLORS } from '../../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getCommodityIcon } from '../helpers';
import commonStyles from '../styles/commonStyles';
import formStyles from '../styles/formStyles';

export default function AmadModal({ visible, onClose, dbFarmers, defaultFarmerId, onAmadSuccess }) {
  const [amadFarmerId, setAmadFarmerId] = useState('');
  const [amadCommodity, setAmadCommodity] = useState('Potato');
  const [amadKism, setAmadKism] = useState('Pukhraj');
  const [amadRoomId, setAmadRoomId] = useState('Room 1');
  const [amadRackId, setAmadRackId] = useState('Rack A');
  const [amadPackets, setAmadPackets] = useState('');
  const [amadWeightQtl, setAmadWeightQtl] = useState('');
  const [amadGoodsCondition, setAmadGoodsCondition] = useState('Fresh');
  const [amadSubmitLoading, setAmadSubmitLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmadFarmerId(defaultFarmerId || '');
    }
  }, [visible, defaultFarmerId]);

  const handleRegisterAmad = async () => {
    if (!amadFarmerId) {
      Alert.alert('Error', 'Please select a farmer.');
      return;
    }
    if (!amadPackets.trim() || !amadWeightQtl.trim()) {
      Alert.alert('Error', 'Bags and Weight are required.');
      return;
    }
    setAmadSubmitLoading(true);
    try {
      const amadData = {
        farmerId: amadFarmerId,
        commodity: amadCommodity,
        kism: amadKism.trim(),
        roomId: amadRoomId.trim(),
        rackId: amadRackId.trim(),
        packets: parseInt(amadPackets.trim(), 10),
        weightQtl: parseFloat(amadWeightQtl.trim()),
        goodsCondition: amadGoodsCondition,
      };
      await addAmad(amadData);
      Alert.alert('Success', 'Amad lot registered successfully!');
      setAmadPackets('');
      setAmadWeightQtl('');
      onAmadSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record Amad');
    } finally {
      setAmadSubmitLoading(false);
    }
  };

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

          <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={formStyles.formGroup}>
              <Text style={formStyles.formLabel}>Select Farmer *</Text>
              {dbFarmers.length === 0 ? (
                <View style={formStyles.errorBorder}>
                  <Text style={formStyles.errorText}>No registered farmers found.</Text>
                </View>
              ) : (
                <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={formStyles.listSelector}>
                  {dbFarmers.map((f) => (
                    <TouchableOpacity
                      key={f.serial_number}
                      onPress={() => setAmadFarmerId(f.serial_number)}
                      style={[formStyles.listItem, amadFarmerId === f.serial_number && formStyles.listItemActive]}
                    >
                      <Text style={[formStyles.listItemText, amadFarmerId === f.serial_number && formStyles.listItemTextActive]}>
                        {f.name} ({f.serial_number})
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>{f.village || 'No village'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={formStyles.formGroup}>
              <Text style={formStyles.formLabel}>Crop / Commodity *</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Potato', 'Tomato', 'Ladyfinger'].map((crop) => (
                  <TouchableOpacity
                    key={crop}
                    onPress={() => setAmadCommodity(crop)}
                    style={[formStyles.badgeSelector, amadCommodity === crop && formStyles.badgeSelectorActive]}
                  >
                    <Text style={[formStyles.badgeText, amadCommodity === crop && formStyles.badgeTextActive]}>
                      {getCommodityIcon(crop)} {crop}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={formStyles.formGroup}>
              <Text style={formStyles.formLabel}>Variety (Kism) *</Text>
              <TextInput style={formStyles.formInput} placeholder="Enter variety (e.g. Pukhraj)" placeholderTextColor={COLORS.textLight} value={amadKism} onChangeText={setAmadKism} />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={formStyles.formLabel}>Room ID</Text>
                <TextInput style={formStyles.formInput} placeholder="e.g. Room 1" placeholderTextColor={COLORS.textLight} value={amadRoomId} onChangeText={setAmadRoomId} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={formStyles.formLabel}>Rack ID</Text>
                <TextInput style={formStyles.formInput} placeholder="e.g. Rack A" placeholderTextColor={COLORS.textLight} value={amadRackId} onChangeText={setAmadRackId} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={formStyles.formLabel}>Bags (Packets) *</Text>
                <TextInput style={formStyles.formInput} placeholder="150" placeholderTextColor={COLORS.textLight} value={amadPackets} onChangeText={setAmadPackets} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={formStyles.formLabel}>Weight (Quintals) *</Text>
                <TextInput style={formStyles.formInput} placeholder="75" placeholderTextColor={COLORS.textLight} value={amadWeightQtl} onChangeText={setAmadWeightQtl} keyboardType="numeric" />
              </View>
            </View>

            <View style={formStyles.formGroup}>
              <Text style={formStyles.formLabel}>Goods Condition</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Fresh', 'Good', 'Average'].map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    onPress={() => setAmadGoodsCondition(cond)}
                    style={[formStyles.badgeSelector, amadGoodsCondition === cond && formStyles.badgeSelectorActive]}
                  >
                    <Text style={[formStyles.badgeText, amadGoodsCondition === cond && formStyles.badgeTextActive]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={formStyles.submitBtn} onPress={handleRegisterAmad} disabled={amadSubmitLoading || dbFarmers.length === 0} activeOpacity={0.85}>
              {!amadSubmitLoading && dbFarmers.length > 0 && (
                <LinearGradient colors={[COLORS.greenDeep, COLORS.greenMid]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              )}
              {amadSubmitLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.submitBtnText}>Record Amad Lot</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
