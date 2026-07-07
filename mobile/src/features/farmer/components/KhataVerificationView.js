import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import styles from '../styles/khataTabStyles';
import { KhataVerificationFormFields } from './KhataVerificationFormFields';
import { KhataVerificationReceiptUpload } from './KhataVerificationReceiptUpload';

export default function KhataVerificationView({
  lang,
  utrNumber,
  setUtrNumber,
  receiptFile,
  receiptFileName,
  setReceiptFile,
  setReceiptFileName,
  paymentDate,
  onUploadReceipt,
  onOpenDatePicker,
  onSubmit,
  onBackPress
}) {
  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.backLinkRow}
          activeOpacity={0.7}
          onPress={onBackPress}
        >
          <Feather name="arrow-left" size={16} color="#2D6A4F" style={{ marginRight: 6 }} />
          <Text style={styles.backLinkText}>
            {lang === 'en' ? 'Back to Summary' : 'सारांश पर वापस जाएं'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.summaryPageTitle}>
          {lang === 'en' ? 'Payment Verification Details' : 'भुगतान सत्यापन विवरण'}
        </Text>

<<<<<<< Updated upstream
        <View style={[styles.summaryDetailsCard, { marginBottom: 16, paddingVertical: 12 }]}>
          <View style={[styles.summaryDetailItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Verifying Amount' : 'सत्यापन राशि'}</Text>
            <Text style={[styles.detailValue, { color: '#2D6A4F', fontWeight: 'bold' }]}>
              ₹{Number(pendingRent || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* UTR Input */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            {lang === 'en' ? 'UTR / Transaction Reference Number *' : 'यूटीआर / लेनदेन संदर्भ संख्या *'}
          </Text>
          <TextInput
            style={styles.formInput}
            placeholder={lang === 'en' ? 'Enter UTR/Transaction ID' : 'यूटीआर/लेनदेन आईडी दर्ज करें'}
            placeholderTextColor="#A1A1AA"
            value={utrNumber}
            onChangeText={setUtrNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
=======
        <KhataVerificationFormFields
          lang={lang}
          utrNumber={utrNumber}
          setUtrNumber={setUtrNumber}
          paymentDate={paymentDate}
          onOpenDatePicker={onOpenDatePicker}
        />
>>>>>>> Stashed changes

        <KhataVerificationReceiptUpload
          lang={lang}
          receiptFile={receiptFile}
          receiptFileName={receiptFileName}
          setReceiptFile={setReceiptFile}
          setReceiptFileName={setReceiptFileName}
          onUploadReceipt={onUploadReceipt}
        />

        <TouchableOpacity
          style={[styles.doneBtn, { marginTop: 12 }]}
          activeOpacity={0.8}
          onPress={onSubmit}
        >
          <Text style={styles.doneBtnText}>
            {lang === 'en' ? 'Submit' : 'जमा करें'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
