import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

export function KhataVerificationReceiptUpload({
  lang,
  receiptFile,
  receiptFileName,
  setReceiptFile,
  setReceiptFileName,
  onUploadReceipt
}) {
  return (
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
  );
}
