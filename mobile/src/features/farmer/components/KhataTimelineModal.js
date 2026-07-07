import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

export function KhataTimelineModal({
  lang,
  visible,
  onClose,
  timelineOption,
  setTimelineOption,
  fromDateStr,
  setFromDateStr,
  toDateStr,
  setToDateStr,
  onConfirm
}) {
  const options = [
    { key: 'last_7_days', en: 'Last 7 Days', hi: 'पिछले 7 दिन' },
    { key: 'last_30_days', en: 'Last 30 Days', hi: 'पिछले 30 दिन' },
    { key: 'last_3_months', en: 'Last 3 Months', hi: 'पिछले 3 महीने' },
    { key: 'last_6_months', en: 'Last 6 Months', hi: 'पिछले 6 महीने' },
    { key: 'last_1_year', en: 'Last 1 Year', hi: 'पिछला 1 वर्ष' },
    { key: 'custom', en: 'Custom Date Range', hi: 'कस्टम तारीख श्रेणी' }
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1B4332' }}>
              {lang === 'en' ? 'Select Statement Period' : 'विवरण अवधि चुनें'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color="#71717A" />
            </TouchableOpacity>
          </View>

          {options.map((opt) => {
            const isSelected = timelineOption === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
                onPress={() => setTimelineOption(opt.key)}
              >
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: isSelected ? '#1E5C2E' : '#A1A1AA', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E5C2E' }} />}
                </View>
                <Text style={{ fontSize: 13, color: '#27272A', fontWeight: isSelected ? '700' : '500' }}>
                  {lang === 'en' ? opt.en : opt.hi}
                </Text>
              </TouchableOpacity>
            );
          })}

          {timelineOption === 'custom' && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: '#F4F4F5', paddingTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#71717A', fontWeight: '700', marginBottom: 6 }}>{lang === 'en' ? 'CUSTOM RANGE (YYYY-MM-DD)' : 'कस्टम रेंज (YYYY-MM-DD)'}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={{ flex: 1, borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 8, padding: 8, fontSize: 12 }} value={fromDateStr} onChangeText={setFromDateStr} placeholder="YYYY-MM-DD" />
                <TextInput style={{ flex: 1, borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 8, padding: 8, fontSize: 12 }} value={toDateStr} onChangeText={setToDateStr} placeholder="YYYY-MM-DD" />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={{ backgroundColor: '#1E5C2E', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 20 }}
            onPress={onConfirm}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{lang === 'en' ? 'Download' : 'डाउनलोड करें'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
