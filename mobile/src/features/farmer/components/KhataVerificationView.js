import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import styles from '../styles/khataTabStyles';

export default function KhataVerificationView({
  lang,
  pendingRent,
  holdingsList = [],
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
  const holding = holdingsList && holdingsList.length > 0 ? holdingsList[0] : null;
  const bookingId = holding?.lot_id || 'BK-99210';

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back to Payment Summary link */}
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

        {/* Receipt Upload */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            {lang === 'en' ? 'Payment Receipt *' : 'भुगतान रसीद *'}
          </Text>

          {receiptFileName || receiptFile ? (
            <View style={styles.uploadedFileRow}>
              <Feather name="file-text" size={20} color="#1E4032" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadedFileName} numberOfLines={1}>
                  {receiptFileName || (receiptFile.startsWith('data:') ? 'Receipt Document' : receiptFile)}
                </Text>
                <Text style={styles.uploadedFileSub}>
                  {lang === 'en' ? 'File ready for upload' : 'फ़ाइल अपलोड के लिए तैयार है'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReceiptFile('');
                  setReceiptFileName('');
                }}
                style={styles.clearFileBtn}
              >
                <Feather name="x-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadAreaContainer}
              activeOpacity={0.8}
              onPress={onUploadReceipt}
            >
              <Feather name="upload-cloud" size={32} color="#2D6A4F" style={{ marginBottom: 8 }} />
              <Text style={styles.uploadAreaTextMain}>
                {lang === 'en' ? 'Choose a File or Drag & Drop here' : 'फ़ाइल चुनें या यहाँ खींचें और छोड़ें'}
              </Text>
              <Text style={styles.uploadAreaTextSub}>
                JPG, PNG, PDF (Max 5 MB)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Date of Payment */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            {lang === 'en' ? 'Date of Payment *' : 'भुगतान की तिथि *'}
          </Text>
          <TouchableOpacity
            style={styles.dateSelectorTrigger}
            activeOpacity={0.8}
            onPress={onOpenDatePicker}
          >
            <Feather name="calendar" size={16} color="#2D6A4F" style={{ marginRight: 8 }} />
            <Text style={styles.dateSelectorText}>
              {paymentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
            <Feather name="chevron-down" size={16} color="#71717A" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Submit Verification Button */}
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
