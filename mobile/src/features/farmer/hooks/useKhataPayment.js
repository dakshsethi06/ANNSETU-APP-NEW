import { useState, useEffect } from 'react';
import { useDatePickerState } from './useDatePickerState';
import { useVerificationState } from './useVerificationState';
import { useOnlinePayment } from './useOnlinePayment';

export function useKhataPayment(farmerData, holdingsList, onPaymentSuccess) {
  const [showSummary, setShowSummary] = useState(false);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [bankName, setBankName] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [lang, setLang] = useState('en');
  const [paymentAmount, setPaymentAmount] = useState('');

  const pendingRent = parseFloat(farmerData?.pendingRent || 0);

  useEffect(() => {
    setPaymentAmount(pendingRent > 0 ? pendingRent.toString() : '0');
  }, [pendingRent]);

  // Sub-hooks integration
  const datePicker = useDatePickerState();
  const verification = useVerificationState(lang, paymentId, datePicker.paymentDate, onPaymentSuccess);
  const online = useOnlinePayment(farmerData, lang, onPaymentSuccess, setShowSummary, setPaymentId);

  const handlePayPress = async (customAmount) => {
    setRazorpayOrderData(null); // Clear old order data before fetch
    
    console.log('[handlePayPress] Received customAmount:', customAmount);
    console.log('[handlePayPress] Current state paymentAmount:', paymentAmount);
    console.log('[handlePayPress] Current pendingRent:', pendingRent);

    let targetAmount = pendingRent;
<<<<<<< Updated upstream
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
        lang === 'en' ? 'No Payment Required' : 'कोई भुगतान आवश्यक नहीं है',
        lang === 'en' ? 'Your net payable amount is ₹0.' : 'आपकी शुद्ध देय राशि ₹0 है।'
      );
      return;
    }

    try {
      const farmerId = farmerData?.id || farmerData?.serial_number;
      if (!farmerId) throw new Error('Farmer identifier not found.');

      const response = await fetch(`${BACKEND_URL}/api/payments/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      Alert.alert('Error', err.message || 'Failed to initiate payment.');
    }
  };

  const handleOnlineCheckout = async () => {
    console.log('[handleOnlineCheckout] Method started.');
    if (!razorpayOrderData) {
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
              lang === 'en' ? 'Payment Successful' : 'भुगतान सफल',
              lang === 'en' ? 'Your dues have been cleared.' : 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।',
              [{ text: 'OK', onPress: () => { setShowSummary(false); if (onPaymentSuccess) onPaymentSuccess(); } }]
            );
          } else {
            throw new Error(verifyData.message || 'Signature rejected.');
          }
        } catch (verifyErr) {
          Alert.alert('Verification Error', verifyErr.message);
        }
      }).catch((error) => {
        if (razorpayOrderData.payment_link_url) {
          setPaymentUrl(razorpayOrderData.payment_link_url);
        } else {
          Alert.alert('Payment Failed', (error && (error.description || error.message)) || 'Payment failed.');
        }
      });
    } catch (sdkErr) {
      if (razorpayOrderData.payment_link_url) setPaymentUrl(razorpayOrderData.payment_link_url);
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
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit.');

      setVerificationStep(2);
      setVerificationSuccessModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err.message);
=======
    if (customAmount !== undefined && customAmount !== '') {
      const parsed = parseFloat(customAmount);
      if (!isNaN(parsed) && parsed > 0) targetAmount = parsed;
>>>>>>> Stashed changes
    }
    if (targetAmount <= 0) return;
    await online.handlePayPress(targetAmount);
  };

  const handleResetAll = () => {
    verification.setUtrNumber('');
    setPaymentMode('UPI');
    setBankName('');
    verification.setReceiptFile('');
    verification.setReceiptFileName('');
    datePicker.setDatePickerVisible(false);
    verification.setVerificationStep(1);
    verification.setShowVerificationForm(false);
    setShowSummary(false);
    online.setIsOnlineSuccess(false);
    if (onPaymentSuccess) onPaymentSuccess();
  };

  return {
    state: {
      showSummary, setShowSummary,
      showVerificationForm: verification.showVerificationForm, setShowVerificationForm: verification.setShowVerificationForm,
      verificationStep: verification.verificationStep, setVerificationStep: verification.setVerificationStep,
      utrNumber: verification.utrNumber, setUtrNumber: verification.setUtrNumber,
      paymentMode, setPaymentMode,
      bankName, setBankName,
      receiptFile: verification.receiptFile, setReceiptFile: verification.setReceiptFile,
      receiptFileName: verification.receiptFileName, setReceiptFileName: verification.setReceiptFileName,
      paymentDate: datePicker.paymentDate, setPaymentDate: datePicker.setPaymentDate,
      datePickerVisible: datePicker.datePickerVisible, setDatePickerVisible: datePicker.setDatePickerVisible,
      lang, setLang,
      pickerDay: datePicker.pickerDay, setPickerDay: datePicker.setPickerDay,
      pickerMonth: datePicker.pickerMonth, setPickerMonth: datePicker.setPickerMonth,
      pickerYear: datePicker.pickerYear, setPickerYear: datePicker.setPickerYear,
      paymentId, setPaymentId,
      verificationSuccessModalVisible: verification.verificationSuccessModalVisible, setVerificationSuccessModalVisible: verification.setVerificationSuccessModalVisible,
      paymentUrl: online.paymentUrl, setPaymentUrl: online.setPaymentUrl,
      razorpayOrderData: online.razorpayOrderData, setRazorpayOrderData: online.setRazorpayOrderData,
      isOnlineSuccess: online.isOnlineSuccess, setIsOnlineSuccess: online.setIsOnlineSuccess,
      pendingRent,
      paymentAmount, setPaymentAmount
    },
    handlers: {
      adjustDay: datePicker.adjustDay, adjustMonth: datePicker.adjustMonth, adjustYear: datePicker.adjustYear,
      handleConfirmDate: datePicker.handleConfirmDate, handleUploadReceipt: verification.handleUploadReceipt,
      handlePayPress, handleOnlineCheckout: online.handleOnlineCheckout,
      handleFormSubmit: verification.handleFormSubmit, handleResetAll
    }
  };
}
