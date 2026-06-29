import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getCommodityIcon } from '../helpers';
import formStyles from '../styles/formStyles';

export default function AmadModalForm(props) {
  const {
    dbFarmers, amadFarmerId, setAmadFarmerId, amadCommodity, setAmadCommodity,
    amadKism, setAmadKism, amadRoomId, setAmadRoomId, amadRackId, setAmadRackId,
    amadPackets, setAmadPackets, amadWeightQtl, setAmadWeightQtl, amadGoodsCondition,
    setAmadGoodsCondition, amadSubmitLoading, handleRegisterAmad
  } = props;

  return (
    <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
      <View style={formStyles.formGroup}>
        <Text style={formStyles.formLabel}>Select Farmer *</Text>
        {dbFarmers.length === 0 ? (
          <View style={formStyles.errorBorder}><Text style={formStyles.errorText}>No registered farmers found.</Text></View>
        ) : (
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={formStyles.listSelector}>
            {dbFarmers.map((f) => (
              <TouchableOpacity key={f.serial_number} onPress={() => setAmadFarmerId(f.serial_number)} style={[formStyles.listItem, amadFarmerId === f.serial_number && formStyles.listItemActive]}>
                <Text style={[formStyles.listItemText, amadFarmerId === f.serial_number && formStyles.listItemTextActive]}>{f.name} ({f.serial_number})</Text>
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
            <TouchableOpacity key={crop} onPress={() => setAmadCommodity(crop)} style={[formStyles.badgeSelector, amadCommodity === crop && formStyles.badgeSelectorActive]}>
              <Text style={[formStyles.badgeText, amadCommodity === crop && formStyles.badgeTextActive]}>{getCommodityIcon(crop)} {crop}</Text>
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
            <TouchableOpacity key={cond} onPress={() => setAmadGoodsCondition(cond)} style={[formStyles.badgeSelector, amadGoodsCondition === cond && formStyles.badgeSelectorActive]}>
              <Text style={[formStyles.badgeText, amadGoodsCondition === cond && formStyles.badgeTextActive]}>{cond}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={formStyles.submitBtn} onPress={handleRegisterAmad} disabled={amadSubmitLoading || dbFarmers.length === 0} activeOpacity={0.85}>
        {!amadSubmitLoading && dbFarmers.length > 0 && <LinearGradient colors={[COLORS.greenDeep, COLORS.greenMid]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
        {amadSubmitLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.submitBtnText}>Record Amad Lot</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
