import { useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../../core/network/config';

export function useVerificationState(lang, paymentId, paymentDate, onPaymentSuccess) {
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [verificationSuccessModalVisible, setVerificationSuccessModalVisible] = useState(false);

  const handleUploadReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        if (selectedFile.size && selectedFile.size > 5 * 1024 * 1024) {
          Alert.alert(
            lang === 'en' ? 'File Too Large' : 'फ़ाइल बहुत बड़ी है',
            lang === 'en' ? 'The selected file exceeds 5 MB.' : 'चुनी गई फ़ाइल 5 एमबी से अधिक है.'
          );
          return;
        }

        setReceiptFileName(selectedFile.name);
        const fileResponse = await fetch(selectedFile.uri);
        const fileBlob = await fileResponse.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
          setReceiptFile(reader.result);
        };
        reader.readAsDataURL(fileBlob);
      }
    } catch (err) {
      console.warn('Document picker error:', err);
      Alert.alert(lang === 'en' ? 'Error' : 'त्रुटि', lang === 'en' ? 'Failed to select document.' : 'दस्तावेज़ चुनने में विफल।');
    }
  };

  const handleFormSubmit = async () => {
    if (!utrNumber.trim()) {
      Alert.alert(lang === 'en' ? 'Required Field' : 'आवश्यक फ़ील्ड', lang === 'en' ? 'Enter UTR ID.' : 'कृपया यूटीआर आईडी दर्ज करें।');
      return;
    }
    if (!receiptFile) {
      Alert.alert(lang === 'en' ? 'Required Field' : 'आवश्यक फ़ील्ड', lang === 'en' ? 'Upload receipt.' : 'कृपया भुगतान रसीद अपलोड करें।');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentId,
          utrNumber: utrNumber,
          receiptFile: receiptFile,
          paymentDate: paymentDate,
          paymentMode: 'Already Paid',
          bankName: 'Already Paid',
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit.');

      setVerificationStep(2);
      setVerificationSuccessModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return {
    showVerificationForm, setShowVerificationForm,
    verificationStep, setVerificationStep,
    utrNumber, setUtrNumber,
    receiptFile, setReceiptFile,
    receiptFileName, setReceiptFileName,
    verificationSuccessModalVisible, setVerificationSuccessModalVisible,
    handleUploadReceipt, handleFormSubmit
  };
}
