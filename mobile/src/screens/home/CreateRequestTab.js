import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS } from '../../theme';

export default function CreateRequestTab({ onBackPress }) {
  const [step, setStep] = useState(1); // 1: Form, 2: Confirmation

  // Form states
  const [farmerId, setFarmerId] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [commodity, setCommodity] = useState('');
  const [bags, setBags] = useState('');

  // Generated states
  const [requestId, setRequestId] = useState('');
  const [requestDate, setRequestDate] = useState('');

  const handleSubmit = () => {
    if (!farmerId.trim() || !farmerName.trim() || !commodity.trim() || !bags.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all form details before submitting.');
      return;
    }

    const numBags = parseInt(bags);
    if (isNaN(numBags) || numBags <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of bags.');
      return;
    }

    // Generate Request ID and Date
    const randomId = 'CS-REQ-' + Math.floor(10000 + Math.random() * 90000);
    const today = new Date();
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-IN', options).replace(/ /g, '-');

    setRequestId(randomId);
    setRequestDate(formattedDate);
    setStep(2);
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.topHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onBackPress} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#1E5C2E" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{step === 1 ? 'Create Request' : 'Request created successfully'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <View>
            <Text style={s.pageTitle}>Request Details</Text>

            {/* Farmer ID Input */}
            <View style={s.formGroup}>
              <Text style={s.label}>FARMER ID</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. F-12345"
                placeholderTextColor="#A1A1AA"
                value={farmerId}
                onChangeText={setFarmerId}
              />
            </View>

            {/* Farmer Name Input */}
            <View style={s.formGroup}>
              <Text style={s.label}>FARMER NAME</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Ram Singh"
                placeholderTextColor="#A1A1AA"
                value={farmerName}
                onChangeText={setFarmerName}
              />
            </View>

            {/* Commodity Input */}
            <View style={s.formGroup}>
              <Text style={s.label}>COMMODITY</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Potato"
                placeholderTextColor="#A1A1AA"
                value={commodity}
                onChangeText={setCommodity}
              />
            </View>

            {/* Number of Bags Input */}
            <View style={s.formGroup}>
              <Text style={s.label}>NUMBER OF BAGS (PACKETS)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 300"
                placeholderTextColor="#A1A1AA"
                keyboardType="numeric"
                value={bags}
                onChangeText={setBags}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={s.btnPrimary} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={s.btnPrimaryText}>Submit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingTop: 10 }}>
            <Text style={s.pageTitle}>Request created successfully</Text>

            {/* Confirmation details card */}
            <View style={s.reviewCard}>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Request ID</Text>
                <Text style={s.reviewValue}>{requestId}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Request Date</Text>
                <Text style={s.reviewValue}>{requestDate}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Farmer ID</Text>
                <Text style={s.reviewValue}>{farmerId}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Farmer Name</Text>
                <Text style={s.reviewValue}>{farmerName}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Commodity</Text>
                <Text style={s.reviewValue}>{commodity}</Text>
              </View>

              <View style={[s.reviewRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                <Text style={s.reviewLabel}>Bags</Text>
                <Text style={s.reviewValue}>{bags}</Text>
              </View>
            </View>



            {/* Return home button */}
            <TouchableOpacity style={s.btnPrimary} onPress={onBackPress} activeOpacity={0.8}>
              <Text style={s.btnPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E8E0CE',
    backgroundColor: '#FAF7F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#1E5C2E',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#18181B',
    marginBottom: 20,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#71717A',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#18181B',
  },
  btnPrimary: {
    backgroundColor: '#1E5C2E',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.sm,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  reviewLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#71717A',
  },
  reviewValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#18181B',
  },
  calloutBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  calloutText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 18,
  },
});
