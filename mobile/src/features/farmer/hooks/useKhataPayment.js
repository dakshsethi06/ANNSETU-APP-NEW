import { useState, useEffect } from 'react';
import { Alert, NativeModules } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import RazorpayCheckout from 'react-native-razorpay';
import { BACKEND_URL } from '../../../core/network/config';
import { useTranslation } from 'react-i18next';

export function useKhataPayment(farmerData, holdingsList, onPaymentSuccess) {
  const { t, i18n } = useTranslation();

  const [showSummary, setShowSummary] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [lang, setLang] = useState('en');

  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [paymentId, setPaymentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [hasInitializedAmount, setHasInitializedAmount] = useState(false);

  // Missing states from previous refactoring
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [isOnlineSuccess, setIsOnlineSuccess] = useState(false);
  const [verificationSuccessModalVisible, setVerificationSuccessModalVisible] = useState(false);

  const pendingRent = parseFloat(farmerData?.pendingRent || 0);

  useEffect(() => {
    if (pendingRent > 0 && !hasInitializedAmount) {
      setPaymentAmount(pendingRent.toString());
      setHasInitializedAmount(true);
    }
  }, [pendingRent, hasInitializedAmount]);

  const adjustDay = (val) => {
    let nextDay = pickerDay + val;
    if (nextDay < 1) nextDay = 31;
    if (nextDay > 31) nextDay = 1;
    setPickerDay(nextDay);
  };

  const adjustMonth = (val) => {
    let nextMonth = pickerMonth + val;
    if (nextMonth < 0) nextMonth = 11;
    if (nextMonth > 11) nextMonth = 0;
    setPickerMonth(nextMonth);
  };

  const adjustYear = (val) => {
    setPickerYear(pickerYear + val);
  };

  const handleConfirmDate = () => {
    const d = new Date(pickerYear, pickerMonth, pickerDay);
    setPaymentDate(d);
    setDatePickerVisible(false);
  };

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

  const handlePayPress = async (customAmount) => {
    setRazorpayOrderData(null); // Clear old order data before fetch

    console.log('[handlePayPress] Received customAmount:', customAmount);
    console.log('[handlePayPress] Current state paymentAmount:', paymentAmount);
    console.log('[handlePayPress] Current pendingRent:', pendingRent);

    let targetAmount = pendingRent;
    let amountToParse = customAmount;

    // If customAmount is a gesture responder event object, fall back to state input
    if (typeof customAmount === 'object' || customAmount === undefined) {
      amountToParse = paymentAmount;
    }

    if (amountToParse !== undefined && amountToParse !== '') {
      const parsed = parseFloat(amountToParse);
      if (!isNaN(parsed) && parsed > 0) {
        targetAmount = parsed;
      }
    }

    console.log('[handlePayPress] Final targetAmount to be sent to API:', targetAmount);

    if (targetAmount <= 0) {
      Alert.alert(
        t('khata.no_payment_required_title'),
        t('khata.no_payment_required_msg')
      );
      return;
    }

    try {
      const farmerId = farmerData?.id || farmerData?.serial_number;
      if (!farmerId) throw new Error('Farmer identifier not found.');

      const { useAuthStore } = require('../../auth/store/useAuthStore');
      const token = useAuthStore.getState().session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/payments/order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ farmerId, amount: targetAmount })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create payment order.');
      }

      const orderData = await response.json();
      if (!orderData.success) throw new Error(orderData.error || 'Order generation failed.');

      setPaymentId(orderData.order_id);
      setRazorpayOrderData(orderData);
      setShowSummary(true);
    } catch (err) {
      Alert.alert(t('khata.error_title'), err.message || t('khata.initiate_failed_error'));
    }
  };

  const handleOnlineCheckout = async () => {
    console.log('[handleOnlineCheckout] Method started.');
    if (!razorpayOrderData) {
      Alert.alert(t('khata.error_title'), t('khata.payment_details_error'));
      console.log('[handleOnlineCheckout] Error: razorpayOrderData is null');
      Alert.alert('Error', 'Payment details are not loaded.');
      return;
    }

    console.log('[handleOnlineCheckout] razorpayOrderData:', razorpayOrderData);

    const isMock = razorpayOrderData.order_id?.startsWith('order_mock_');
    const hasNativeSDK = !!NativeModules.RazorpayCheckout;
    console.log('[handleOnlineCheckout] isMock:', isMock, 'hasNativeSDK:', hasNativeSDK);

    if (isMock || !hasNativeSDK || !RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      console.log('[handleOnlineCheckout] Falling back to Web Checkout URL:', razorpayOrderData.payment_link_url);
      if (razorpayOrderData.payment_link_url) {
        setPaymentUrl(razorpayOrderData.payment_link_url);
        return;
      } else {
        Alert.alert(t('khata.error_title'), t('khata.payment_link_error'));
        console.log('[handleOnlineCheckout] Error: payment_link_url is missing.');
        Alert.alert('Error', 'Payment link URL not generated.');
        return;
      }
    }

    try {
      console.log('[handleOnlineCheckout] Opening native Razorpay Checkout SDK.');
      const options = {
        description: `Rent payment for Farmer ${farmerData.id || farmerData.serial_number}`,
        image: 'https://annsetu.local/logo.png',
        currency: razorpayOrderData.currency || 'INR',
        key: razorpayOrderData.key_id,
        amount: Math.round(razorpayOrderData.amount * 100),
        name: 'Annsetu',
        order_id: razorpayOrderData.order_id,
        prefill: {
          email: `farmer_${farmerData.id || farmerData.serial_number}@annsetu.local`,
          contact: farmerData.phone || '9999999999',
          name: farmerData.name || 'Farmer Partner'
        },
        theme: { color: '#1E5C2E' }
      };

      RazorpayCheckout.open(options).then(async (data) => {
        try {
          const verifyRes = await fetch(`${BACKEND_URL}/api/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature
            })
          });

          if (!verifyRes.ok) throw new Error('Signature verification failed.');
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            Alert.alert(
              t('khata.payment_successful_title'),
              t('khata.payment_successful_msg'),
              [{ text: t('khata.confirm'), onPress: () => { setShowSummary(false); if (onPaymentSuccess) onPaymentSuccess(); } }]
            );
          } else {
            throw new Error(verifyData.message || 'Signature rejected.');
          }
        } catch (verifyErr) {
          Alert.alert(t('khata.error_title'), verifyErr.message);
        }
      }).catch((error) => {
        console.log('[handleOnlineCheckout] RazorpayCheckout.open caught error:', error);
        
        // Identify if the error is a user cancellation
        const errCode = error && error.code !== undefined ? String(error.code) : '';
        const errDesc = (error && (error.description || error.message || (typeof error === 'string' ? error : ''))).toLowerCase();
        const isCancelled = 
          errCode === '0' ||
          errCode === '2' ||
          errCode === 'PAYMENT_CANCELLED' || 
          errDesc.includes('cancel') || 
          errDesc.includes('dismiss') || 
          errDesc.includes('user');
        
        if (isCancelled) {
          console.log('[handleOnlineCheckout] Payment was explicitly cancelled/dismissed by the user.');
          return;
        }

        Alert.alert(t('khata.error_title'), (error && (error.description || error.message)) || 'Payment failed.');
      });
    } catch (sdkErr) {
      if (razorpayOrderData.payment_link_url) setPaymentUrl(razorpayOrderData.payment_link_url);
    }
  };

  const handleFormSubmit = async () => {
    if (!utrNumber.trim()) {
      Alert.alert(t('khata.required_field_title'), t('khata.enter_utr_msg'));
      return;
    }
    if (!receiptFile) {
      Alert.alert(t('khata.required_field_title'), t('khata.upload_receipt_msg'));
      return;
    }

    try {
      const { useAuthStore } = require('../../auth/store/useAuthStore');
      const token = useAuthStore.getState().session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/payments/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          paymentId: paymentId,
          utrNumber: utrNumber,
          receiptFile: receiptFile,
          paymentDate: paymentDate,
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

  const handleResetAll = () => {
    setUtrNumber('');
    setReceiptFile('');
    setReceiptFileName('');
    setDatePickerVisible(false);
    setVerificationStep(1);
    setShowVerificationForm(false);
    setShowSummary(false);
    setIsOnlineSuccess(false);
    setPaymentAmount('');
    setHasInitializedAmount(false);
    if (onPaymentSuccess) onPaymentSuccess();
  };

  return {
    state: {
      showSummary, setShowSummary,
      showVerificationForm, setShowVerificationForm,
      verificationStep, setVerificationStep,
      utrNumber, setUtrNumber,
      receiptFile, setReceiptFile,
      receiptFileName, setReceiptFileName,
      paymentDate, setPaymentDate,
      datePickerVisible, setDatePickerVisible,
      lang, setLang,
      pickerDay, setPickerDay,
      pickerMonth, setPickerMonth,
      pickerYear, setPickerYear,
      paymentId, setPaymentId,
      verificationSuccessModalVisible, setVerificationSuccessModalVisible,
      paymentUrl, setPaymentUrl,
      razorpayOrderData, setRazorpayOrderData,
      isOnlineSuccess, setIsOnlineSuccess,
      pendingRent,
      paymentAmount, setPaymentAmount
    },
    handlers: {
      adjustDay, adjustMonth, adjustYear,
      handleConfirmDate, handleUploadReceipt,
      handlePayPress, handleOnlineCheckout,
      handleFormSubmit, handleResetAll
    }
  };
}
