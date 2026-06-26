import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import dashboardStyles from './styles/dashboardStyles';
import storageStyles from './styles/storageStyles';

export default function ColdStorageMandiPrices({ setActiveTab }) {
  const items = [
    { commodity: 'Potato (Pukhraj)', location: 'Agra', price: '₹820', trend: '↗ 15', trendColor: '#2E7D32' },
    { commodity: 'Potato (Chipsona)', location: 'Firozabad', price: '₹950', trend: '↘ 20', trendColor: '#C62828' },
    { commodity: 'Onion', location: 'Tundla', price: '₹1100', trend: '↗ 45', trendColor: '#2E7D32' }
  ];

  return (
    <View style={{ width: '100%' }}>
      <View style={dashboardStyles.csSectionHeaderRow}>
        <Text style={dashboardStyles.csSectionTitle}>Live Mandi Prices</Text>
        <TouchableOpacity onPress={() => setActiveTab('prices')}>
          <Text style={dashboardStyles.csViewAllText}>View All ›</Text>
        </TouchableOpacity>
      </View>
      <View style={storageStyles.csPricesList}>
        {items.map((item, idx) => (
          <View key={item.commodity + idx} style={storageStyles.csPriceItem}>
            <View>
              <Text style={storageStyles.csPriceName}>{item.commodity}</Text>
              <Text style={storageStyles.csPriceLoc}>{item.location}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={storageStyles.csPriceVal}>{item.price}</Text>
              <Text style={[storageStyles.csPriceTrend, { color: item.trendColor }]}>{item.trend}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
