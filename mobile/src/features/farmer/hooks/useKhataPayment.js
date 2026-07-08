import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDatePickerState } from './useDatePickerState';
import { useVerificationState } from './useVerificationState';
import { useOnlinePayment } from './useOnlinePayment';

export function useKhataPayment(farmerData, holdingsList, onPaymentSuccess) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [showSummary, setShowSummary] = useState(false);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [bankName, setBankName] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const pendingRent = parseFloat(farmerData?.pendingRent || 0);

  useEffect(() => {
    if (pendingRent > 0) {
      setPaymentAmount(pendingRent.toString());
    } else {
      setPaymentAmount('0');
    }
  }, [pendingRent]);

  const datePicker = useDatePickerState();
  const verification = useVerificationState(lang, paymentId, datePicker.paymentDate, onPaymentSuccess);
  const online = useOnlinePayment(farmerData, lang, onPaymentSuccess, setShowSummary, setPaymentId);

  const handlePayPress = async (customAmount) => {

    online.setRazorpayOrderData(null); // Clear old order data before fetch
    
    console.log('[handlePayPress] Received customAmount:', customAmount);
    console.log('[handlePayPress] Current state paymentAmount:', paymentAmount);
    console.log('[handlePayPress] Current pendingRent:', pendingRent);
    let targetAmount = pendingRent;
    if (customAmount !== undefined && customAmount !== '') {
      const parsed = parseFloat(customAmount);
      if (!isNaN(parsed) && parsed > 0) targetAmount = parsed;
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
      lang: i18n.language,
      setLang: (l) => i18n.changeLanguage(l),
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
