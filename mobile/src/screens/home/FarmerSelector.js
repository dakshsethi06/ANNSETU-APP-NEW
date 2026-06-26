import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../theme';
import layoutStyles from './styles/layoutStyles';
import dashboardStyles from './styles/dashboardStyles';
import storageStyles from './styles/storageStyles';

export default function FarmerSelector({
  farmers,
  searchQuery,
  onSearchQueryChange,
  onSelectFarmer,
  onRegisterPress,
}) {
  const filteredFarmers = farmers.filter(
    (f) =>
      (f.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (f.state || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <View style={{ width: '100%' }}>
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
