import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatLedgerDateTime } from '../utils/khataHelpers';

export function KhataLedgerBlock({ lang, ledgerList, farmerData, setSelectedEntry }) {
  if (ledgerList.length === 0) {
    return (
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderColor: '#E4E4E7', borderWidth: 1, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        <Feather name="book-open" size={32} color="#A1A1AA" style={{ marginBottom: 12 }} />
        <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
          {lang === 'en' ? 'No transactions.' : 'कोई लेनदेन नहीं मिला।'}
        </Text>
      </View>
    );
  }

  const groups = {};
  const groupKeys = [];
  ledgerList.forEach(item => {
    const monthKey = new Date(item.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'hi-IN', { month: 'long', year: 'numeric' });
    if (!groups[monthKey]) {
      groups[monthKey] = [];
      groupKeys.push(monthKey);
    }
    groups[monthKey].push(item);
  });

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderColor: '#E4E4E7', borderWidth: 1, marginTop: 12, marginBottom: 20 }}>
      {groupKeys.map((monthKey) => {
        const items = groups[monthKey];
        const monthTotal = items.reduce((sum, item) => sum + Math.abs(item.amount), 0);
        return (
          <View key={monthKey}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#E4E4E7' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1B4332', textTransform: 'capitalize' }}>{monthKey}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1B4332' }}>₹{monthTotal.toLocaleString('en-IN')}</Text>
            </View>

            {items.map((item, idx) => {
              const isDebit = item.amount < 0;
              const counterpartyName = farmerData?.coldStorageName || 'SN Sharma Cold Storage';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: idx === items.length - 1 ? 0 : 1, borderColor: '#F4F4F5' }}
                  activeOpacity={0.7}
                  onPress={() => setSelectedEntry(item)}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDebit ? '#FEE2E2' : '#DCFCE7', justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name={isDebit ? "shopping-bag" : "arrow-down-left"} size={18} color={isDebit ? "#EF4444" : "#16A34A"} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#18181B' }} numberOfLines={1}>{isDebit ? item.title : counterpartyName}</Text>
                    {!isDebit && item.reference ? (
                      <Text style={{ fontSize: 11, color: '#71717A', marginTop: 1, fontFamily: 'monospace' }} numberOfLines={1}>{item.reference}</Text>
                    ) : isDebit && item.billNumber ? (
                      <Text style={{ fontSize: 11, color: '#71717A', marginTop: 1 }} numberOfLines={1}>{lang === 'en' ? 'Invoice #' : 'चालान #'}{item.billNumber}</Text>
                    ) : null}
                    <Text style={{ fontSize: 10, color: '#A1A1AA', marginTop: 2 }}>{formatLedgerDateTime(item.date, lang)}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDebit ? '#18181B' : '#16A34A' }}>{isDebit ? '' : '+ '}₹{Math.abs(item.amount).toLocaleString('en-IN')}</Text>
                    <Text style={{ fontSize: 10, color: '#71717A', marginTop: 4 }}>
                      {isDebit ? (lang === 'en' ? 'Billed' : 'प्रभार') : (lang === 'en' ? 'Via ' + (item.paymentMode || 'UPI') : (item.paymentMode || 'UPI') + ' द्वारा')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
