import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../../core/theme/theme';
import layoutStyles from '../styles/layoutStyles';
import dashboardStyles from '../styles/dashboardStyles';
import storageStyles from '../../cold-storage/styles/storageStyles';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../core/network/supabase';

export default function FarmerSelector({
  farmers,
  searchQuery,
  onSearchQueryChange,
  onSelectFarmer,
  onRegisterPress,
  onLogout,
}) {
  const filteredFarmers = farmers.filter(
    (f) =>
      (f.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (f.state || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <View style={{ width: '100%' }}>
      {/* Top Header Bar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderColor: '#E8E0CE',
        marginBottom: 16,
      }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.greenDeep }}>Annsetu</Text>
        <TouchableOpacity 
          onPress={onLogout} 
          style={{ padding: 10, backgroundColor: '#F0FDF4', borderRadius: 20, borderWidth: 1, borderColor: '#DCFCE7' }}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color={COLORS.greenDeep} />
        </TouchableOpacity>
      </View>

      <Text style={dashboardStyles.csSectionTitle}>Select a Farmer</Text>
      <Text style={[layoutStyles.subtitle, { marginBottom: 16, textAlign: 'left' }]}>
        Choose a farmer profile to view their dashboard
      </Text>

      {/* Search Input Bar */}
      <View style={storageStyles.searchContainer}>
        <TextInput
          style={storageStyles.searchInput}
          placeholder="Search farmers..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          autoCorrect={false}
        />
        <TouchableOpacity
          style={storageStyles.searchButton}
          onPress={onRegisterPress}
          activeOpacity={0.8}
        >
          <Text style={storageStyles.searchButtonText}>➕ Register</Text>
        </TouchableOpacity>
      </View>

      {/* Farmers List */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
        {filteredFarmers.map((f) => (
          <TouchableOpacity
            key={f.serial_number}
            style={storageStyles.farmerListCard}
            onPress={() => onSelectFarmer(f.serial_number)}
            activeOpacity={0.7}
          >
            <View style={storageStyles.farmerListAvatar}>
              <Text style={{ fontSize: 22 }}>👨‍🌾</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={storageStyles.farmerListName}>{f.name}</Text>
              <Text style={storageStyles.farmerListMeta}>
                {f.village ? `${f.village}, ` : ''}
                {f.district || f.state || 'Rajasthan'}
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: '#C4B99A' }}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
