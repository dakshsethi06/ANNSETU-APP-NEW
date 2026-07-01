import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { addAmad, fetchColdStorages } from '../../services/api';
import { COLORS, SHADOWS, FONTS } from '../../theme';

export default function BookStorageTab({ farmerData = {}, onBackPress, onBookingSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedStorage, setSelectedStorage] = useState(null);

  // Form states
  const [commodity, setCommodity] = useState('');
  const [variety, setVariety] = useState('');
  const [bags, setBags] = useState('');
  const [weight, setWeight] = useState('');

  const [loading, setLoading] = useState(false);
  const [coldStorages, setColdStorages] = useState([]);
  const [storagesLoading, setStoragesLoading] = useState(true);

  useEffect(() => {
    loadStorages();
  }, []);

  const loadStorages = async () => {
    setStoragesLoading(true);
    try {
      const list = await fetchColdStorages();
      const mapped = (list || []).map(item => ({
        id: item.id,
        name: item.name || 'Unnamed Cold Storage',
        available: 1000,
        rate: 135,
        location: `${item.city || 'Tundla'}, ${item.district || 'Firozabad'}`
      }));
      setColdStorages(mapped);
    } catch (err) {
      console.warn('Failed to load cold storages:', err.message);
      setColdStorages([]);
    } finally {
      setStoragesLoading(false);
    }
  };

  // Auto-fill defaults or helpers if any
  useEffect(() => {
    if (farmerData.primaryCrop) {
      setCommodity(farmerData.primaryCrop);
    }
  }, [farmerData]);

  const handleSelectStorage = (storage) => {
    setSelectedStorage(storage);
    setStep(2);
  };

  const handleContinue = () => {
    if (!commodity.trim() || !variety.trim() || !bags.trim() || !weight.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all form details before continuing.');
      return;
    }
    const numBags = parseInt(bags);
    const numWeight = parseFloat(weight);

    if (isNaN(numBags) || numBags <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of bags.');
      return;
    }
    if (isNaN(numWeight) || numWeight <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid weight.');
      return;
    }
    setStep(3);
  };

  const handleSubmitBooking = async () => {
    setLoading(true);
    try {
      const amadData = {
        farmerId: farmerData.serial_number, // Real database farmer primary ID
        commodity: commodity.trim(),
        kism: variety.trim(),
        packets: parseInt(bags),
        weightQtl: parseFloat(weight),
        coldStorageId: selectedStorage.id,
      };

      await addAmad(amadData);
      
      Alert.alert(
        'Booking Confirmed', 
        'Your booking request has been successfully registered in the database.',
        [{ text: 'OK', onPress: onBookingSuccess }]
      );
    } catch (err) {
      console.error('Failed to submit booking:', err.message);
      Alert.alert('Submission Failed', err.message || 'Failed to register storage booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      onBackPress();
    }
  };

  // Calculations for step 3 review card
  const estimatedCost = selectedStorage 
    ? (parseInt(bags || 0) * selectedStorage.rate) 
    : 0;

  return (
    <View style={s.container}>
      {/* ─── Header Row ─── */}
      <View style={s.topHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onBackPress} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color="#1E5C2E" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Book Storage</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {/* ─── Stepper Progress Row ─── */}
      <View style={s.stepperRow}>
        {/* Step 1 Badge */}
        <View style={[s.stepCircle, s.stepCircleActive]}>
          <Text style={[s.stepNumber, s.stepNumberActive]}>1</Text>
        </View>
        
        {/* Connecting line 1 */}
        <View style={[s.stepLine, step > 1 && s.stepLineActive]} />

        {/* Step 2 Badge */}
        <View style={[s.stepCircle, step >= 2 && s.stepCircleActive]}>
          {step > 2 ? (
            <Feather name="check" size={12} color="#FFFFFF" />
          ) : (
            <Text style={[s.stepNumber, step >= 2 && s.stepNumberActive]}>2</Text>
          )}
        </View>

        {/* Connecting line 2 */}
        <View style={[s.stepLine, step > 2 && s.stepLineActive]} />

        {/* Step 3 Badge */}
        <View style={[s.stepCircle, step === 3 && s.stepCircleActive]}>
          <Text style={[s.stepNumber, step === 3 && s.stepNumberActive]}>3</Text>
        </View>
      </View>

      {/* Stepper Labels */}
      <View style={s.stepperLabelsRow}>
        <Text style={[s.stepLabel, step === 1 && s.stepLabelActive]}>Storage</Text>
        <Text style={[s.stepLabel, step === 2 && s.stepLabelActive]}>Crop Details</Text>
        <Text style={[s.stepLabel, step === 3 && s.stepLabelActive]}>Confirm</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>Select Cold Storage</Text>
            {storagesLoading ? (
              <ActivityIndicator size="small" color="#1E5C2E" style={{ paddingVertical: 40 }} />
            ) : coldStorages.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#71717A', fontSize: 13 }}>No active cold storages available.</Text>
              </View>
            ) : (
              coldStorages.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={s.storageCard}
                  onPress={() => handleSelectStorage(item)}
                  activeOpacity={0.7}
                >
                  <View style={s.storageIconWrapper}>
                    <Feather name="snowflake" size={16} color="#3B82F6" />
                  </View>
                  <View style={s.storageInfo}>
                    <Text style={s.storageName}>{item.name}</Text>
                    <Text style={s.storageMeta}>
                      Location: {item.location} · Rate: ₹{item.rate}/pkt
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#A1A1AA" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {step === 2 && (
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>Crop Details</Text>

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

            <View style={s.formGroup}>
              <Text style={s.label}>VARIETY</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Pukhraj, Chipsona"
                placeholderTextColor="#A1A1AA"
                value={variety}
                onChangeText={setVariety}
              />
            </View>

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

            <View style={s.formGroup}>
              <Text style={s.label}>APPROX. WEIGHT (QTL)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 150"
                placeholderTextColor="#A1A1AA"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={handleContinue} activeOpacity={0.8}>
              <Text style={s.btnPrimaryText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>Confirm Booking</Text>

            {/* Review Card */}
            <View style={s.reviewCard}>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Storage</Text>
                <Text style={s.reviewValue}>{selectedStorage?.displayNameShort}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Commodity</Text>
                <Text style={s.reviewValue}>{commodity} ({variety})</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Bags</Text>
                <Text style={s.reviewValue}>{bags}</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Weight</Text>
                <Text style={s.reviewValue}>{weight} Qtl</Text>
              </View>

              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Rate</Text>
                <Text style={s.reviewValue}>₹{selectedStorage?.rate}/packet/year</Text>
              </View>

              <View style={[s.reviewRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={[s.reviewLabel, { fontWeight: '700', color: '#18181B' }]}>Est. Annual Cost</Text>
                <Text style={[s.reviewValue, { fontWeight: '800', color: '#1E5C2E' }]}>
                  ₹{estimatedCost.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Callout Info Box */}
            <View style={s.calloutBox}>
              <Text style={s.calloutText}>
                Your booking request will be sent to the cold storage for approval. You will receive an OTP confirmation.
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#1E5C2E" style={{ marginVertical: 16 }} />
            ) : (
              <TouchableOpacity style={s.btnPrimary} onPress={handleSubmitBooking} activeOpacity={0.8}>
                <Text style={s.btnPrimaryText}>Submit Booking Request</Text>
              </TouchableOpacity>
            )}
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

  // Stepper UI
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingHorizontal: 36,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: '#1E5C2E',
  },
  stepCircleCompleted: {
    backgroundColor: '#15803D',
  },
  stepNumber: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#71717A',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E4E4E7',
    marginHorizontal: -4,
    zIndex: 1,
  },
  stepLineActive: {
    backgroundColor: '#15803D',
  },
  stepperLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  stepLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#A1A1AA',
  },
  stepLabelActive: {
    fontFamily: FONTS.bold,
    color: '#18181B',
  },

  // Scroll details
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

  // Step 1: Storage Card
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  storageIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageInfo: {
    flex: 1,
    marginLeft: 16,
  },
  storageName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#18181B',
    marginBottom: 4,
  },
  storageMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#71717A',
  },

  // Step 2: Form Group
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
    height: 48,
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
    marginTop: 16,
    ...SHADOWS.sm,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Step 3: Review Card
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
    lineHeight: 18,
  },
});
