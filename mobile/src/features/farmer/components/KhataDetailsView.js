import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, Linking, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getFormattedReceiptUrl, getDetailedTransactionInfo } from '../utils/khataHelpers';
import { KhataFullscreenImageModal } from './KhataFullscreenImageModal';
import styles from '../styles/khataTabStyles';

export function KhataDetailsView({
  lang, selectedEntry, setSelectedEntry, farmerData, state, BACKEND_URL,
  imageModalVisible, setImageModalVisible, fullImageUrl, setFullImageUrl,
  imageLoading, setImageLoading, imageError, setImageError, receiptDownloading
}) {
  const isDebit = selectedEntry.amount < 0;
  const absPriceStr = Math.abs(selectedEntry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const info = getDetailedTransactionInfo(selectedEntry, farmerData, state);
  const hasReceipt = !isDebit && selectedEntry.note && (selectedEntry.note.toLowerCase().includes('/uploads/') || /\.(jpg|jpeg|png|pdf)$/i.test(selectedEntry.note));

  const fields = [
    { label: lang === 'en' ? 'TRANSACTION STATUS' : 'लेनदेन की स्थिति', value: info.status, color: ['SUCCESS', 'APPROVED', 'PAID'].includes(info.status) ? '#16A34A' : '#B45309', bold: true },
    { label: lang === 'en' ? 'AMOUNT' : 'राशि', value: info.amount, bold: true },
    { label: lang === 'en' ? 'TRANSACTION TYPE' : 'लेनदेन का प्रकार', value: info.type, color: isDebit ? '#DC2626' : '#16A34A', bold: true },
    { label: lang === 'en' ? 'DATE & TIME' : 'दिनांक और समय', value: info.dateTime },
    { label: lang === 'en' ? 'UTR / REFERENCE NUMBER' : 'यूटीआर / संदर्भ संख्या', value: info.utr, uppercase: true },
    { label: lang === 'en' ? 'FROM ACCOUNT' : 'खाते से', value: info.fromAccount },
    { label: lang === 'en' ? 'TO ACCOUNT / BENEFICIARY' : 'खाते में / लाभार्थी', value: info.toAccount },
    { label: lang === 'en' ? 'PAYMENT MODE' : 'भुगतान का प्रकार', value: isDebit ? info.paymentMode : (hasReceipt ? (lang === 'en' ? 'Already paid' : 'पहले से भुगतान किया गया') : info.paymentMode) },
    { label: lang === 'en' ? 'REMARKS / DESCRIPTION' : 'टिप्पणी / विवरण', value: info.remarks }
  ];

  if (isDebit || !hasReceipt) {
    fields.push(
      { label: lang === 'en' ? 'BANK NAME' : 'बैंक का नाम', value: info.bankName },
      { label: lang === 'en' ? 'TRANSACTION ID' : 'लेनदेन आईडी', value: info.transactionId }
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSelectedEntry(null)}>
          <Feather name="arrow-left" size={24} color="#1E5C2E" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1B4332', marginLeft: 8 }}>{lang === 'en' ? 'Transaction Details' : 'लेनदेन का विवरण'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E4E4E7' }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: isDebit ? '#FEE2E2' : '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Feather name={isDebit ? "arrow-up-right" : "arrow-down-left"} size={30} color={isDebit ? "#EF4444" : "#16A34A"} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: isDebit ? '#EF4444' : '#16A34A' }}>₹{absPriceStr}</Text>
            <Text style={{ fontSize: 13, color: '#71717A', marginTop: 4, fontWeight: '500' }}>{isDebit ? (lang === 'en' ? 'DEBIT (CHARGE)' : 'डेबिट (शुल्क)') : (lang === 'en' ? 'CREDIT (PAYMENT)' : 'क्रेडिट (भुगतान)')}</Text>
          </View>

          <View style={{ borderTopWidth: 1, borderColor: '#F4F4F5', paddingTop: 16 }}>
            {fields.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: '#71717A', fontWeight: '600', width: '40%' }}>{f.label}</Text>
                <Text style={{ fontSize: 12, color: f.color || '#3F3F46', fontWeight: f.bold ? '700' : '500', textAlign: 'right', flex: 1, marginLeft: 16, textTransform: f.uppercase ? 'uppercase' : 'none' }}>{f.value}</Text>
              </View>
            ))}

            {hasReceipt && selectedEntry.note && selectedEntry.note.trim() && (
              <View style={{ borderTopWidth: 1, borderColor: '#F4F4F5', marginTop: 14, paddingTop: 14 }}>
                <Text style={{ fontSize: 11, color: '#71717A', fontWeight: '600', marginBottom: 8 }}>{lang === 'en' ? 'Receipt File' : 'रसीद फ़ाइल'}</Text>
                {selectedEntry.note.toLowerCase().endsWith('.pdf') ? (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7' }} onPress={() => Linking.openURL(getFormattedReceiptUrl(selectedEntry.note, BACKEND_URL))}>
                    <Feather name="file-text" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700', flex: 1 }}>{lang === 'en' ? 'View Uploaded PDF Receipt' : 'अपलोड की गई पीडीएफ रसीद देखें'}</Text>
                    <Feather name="external-link" size={14} color="#16A34A" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#1E5C2E', backgroundColor: '#DCFCE7' }} activeOpacity={0.7} onPress={() => { setFullImageUrl(getFormattedReceiptUrl(selectedEntry.note, BACKEND_URL)); setImageModalVisible(true); }}>
                    <Feather name="file-text" size={16} color="#1E5C2E" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 12, color: '#1E5C2E', fontWeight: '700', flex: 1 }} numberOfLines={1}>{lang === 'en' ? 'View Receipt / रसीद देखें' : 'View Receipt / रसीद देखें'}</Text>
                    <Feather name="external-link" size={14} color="#1E5C2E" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={receiptDownloading} transparent={true} animationType="none">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
            <ActivityIndicator size="large" color="#1E5C2E" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1B4332' }}>{lang === 'en' ? 'Generating Receipt...' : 'रसीद तैयार हो रही है...'}</Text>
          </View>
        </View>
      </Modal>

      <KhataFullscreenImageModal visible={imageModalVisible} onClose={() => { setImageModalVisible(false); setFullImageUrl(''); setImageError(false); }} fullImageUrl={fullImageUrl} imageLoading={imageLoading} setImageLoading={setImageLoading} imageError={imageError} setImageError={setImageError} />
    </View>
  );
}
