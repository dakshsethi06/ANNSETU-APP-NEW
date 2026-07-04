import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert, StatusBar, Modal, TextInput, ActivityIndicator, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import RazorpayCheckout from 'react-native-razorpay';
import { COLORS, SHADOWS, FONTS } from '../../theme';
import AnnsetuLogo from '../../components/AnnsetuLogo';
import { BACKEND_URL } from '../../services/api';

export default function KhataTab({ farmerData, ledgerList = [], holdingsList = [], userRole = 'farmer', onPaymentSuccess }) {
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
  const [verificationSuccessModalVisible, setVerificationSuccessModalVisible] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);

  const pendingRent = parseFloat(farmerData?.pendingRent || 0);

  // Compute total charged and total paid from live database records
  const totalCharged = ledgerList.reduce((sum, item) => item.amount < 0 ? sum + Math.abs(item.amount) : sum, 0);
  const totalPaid = ledgerList.reduce((sum, item) => item.amount > 0 ? sum + item.amount : sum, 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-IN', options);
    } catch (e) {
      return dateStr;
    }
  };

  const formatPrice = (val) => {
    const isNegative = val < 0;
    const sign = isNegative ? '-' : '+';
    const formatted = Math.abs(val).toLocaleString('en-IN');
    return `${sign}₹${formatted}`;
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsHindi = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

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
            lang === 'en'
              ? 'The selected file exceeds the 5 MB limit.'
              : 'चुनी गई फ़ाइल 5 एमबी की सीमा से अधिक है।'
          );
          return;
        }

        setReceiptFileName(selectedFile.name);

        // Convert file locally to base64 Data URL
        try {
          const fileResponse = await fetch(selectedFile.uri);
          const fileBlob = await fileResponse.blob();
          const reader = new FileReader();

          reader.onloadend = () => {
            setReceiptFile(reader.result); // Stores base64 data URL
          };
          reader.onerror = (e) => {
            console.warn('FileReader error:', e);
            Alert.alert('Error', 'Failed to read the file.');
          };
          reader.readAsDataURL(fileBlob);
        } catch (readErr) {
          console.warn('Failed to read file as base64:', readErr.message);
          Alert.alert('Error', 'Failed to process document.');
        }
      }
    } catch (err) {
      console.warn('Document picker error:', err);
      Alert.alert(
        lang === 'en' ? 'Error' : 'त्रुटि',
        lang === 'en' ? 'Failed to select document.' : 'दस्तावेज़ चुनने में विफल।'
      );
    }
  };

  const handlePayPress = async () => {
    if (pendingRent <= 0) {
      Alert.alert(
        lang === 'en' ? 'No Payment Required' : 'कोई भुगतान आवश्यक नहीं है',
        lang === 'en'
          ? 'Your net payable amount is ₹0. No payment is required at this time.'
          : 'आपकी शुद्ध देय राशि ₹0 है। इस समय किसी भुगतान की आवश्यकता नहीं है।'
      );
      return;
    }

    try {
      const farmerId = farmerData?.id || farmerData?.serial_number;
      if (!farmerId) throw new Error('Farmer identifier not found.');

      // Create Razorpay order on backend
      const orderUrl = `${BACKEND_URL}/api/payments/order`;
      console.log('[KhataTab] Creating order via:', orderUrl, 'for:', farmerId);
      const response = await fetch(orderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create payment order.');
      }

      const orderData = await response.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Gateway order generation failed.');
      }

      setPaymentId(orderData.order_id);
      setRazorpayOrderData(orderData);
      setShowSummary(true);
    } catch (err) {
      console.warn('[KhataTab] initiate payment failed:', err.message);
      Alert.alert('Error', err.message || 'Failed to initiate payment.');
    }
  };

  const handleOnlineCheckout = async () => {
    if (!razorpayOrderData) {
      Alert.alert('Error', 'Payment details are not loaded.');
      return;
    }

    // Open RazorpayCheckout native SDK or fall back to WebView
    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      console.warn('RazorpayCheckout native module is not available. Falling back to WebView.');
      if (razorpayOrderData.payment_link_url) {
        setPaymentUrl(razorpayOrderData.payment_link_url);
        return;
      } else {
        Alert.alert('Error', 'Payment link URL not generated by the server.');
        return;
      }
    }

    try {
      const options = {
        description: `Rent payment for Farmer account ${farmerData.id || farmerData.serial_number}`,
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
        // Post signature details to verify on backend
        try {
          const verifyUrl = `${BACKEND_URL}/api/payments/verify`;
          const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature
            })
          });

          if (!verifyRes.ok) {
            const errData = await verifyRes.json();
            throw new Error(errData.error || 'Signature verification failed.');
          }

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            Alert.alert(
              lang === 'en' ? 'Payment Successful' : 'भुगतान सफल',
              lang === 'en' ? 'Your dues have been cleared successfully.' : 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowSummary(false);
                    if (onPaymentSuccess) {
                      onPaymentSuccess();
                    }
                  }
                }
              ]
            );
          } else {
            throw new Error(verifyData.message || 'Signature verification rejected.');
          }
        } catch (verifyErr) {
          Alert.alert('Verification Error', verifyErr.message);
        }
      }).catch((error) => {
        console.warn('Razorpay SDK payment failure:', error);
        // Check if this looks like a native linking or library error, fall back to WebView
        const isNativeErr = !error ||
          (error instanceof Error) ||
          (error.message && typeof error.message === 'string') ||
          (error.description && error.description.toLowerCase().includes('not a function')) ||
          (error.code && error.code === 'NATIVE_MODULE_NOT_FOUND');

        if (isNativeErr) {
          console.warn('Native RazorpayCheckout failed. Falling back to WebView.');
          if (razorpayOrderData.payment_link_url) {
            setPaymentUrl(razorpayOrderData.payment_link_url);
          }
        } else {
          Alert.alert('Payment Failed', error.description || 'Payment was cancelled or failed.');
        }
      });
    } catch (sdkErr) {
      console.warn('RazorpayCheckout initiation crash. Falling back to WebView.', sdkErr);
      if (razorpayOrderData.payment_link_url) {
        setPaymentUrl(razorpayOrderData.payment_link_url);
      } else {
        Alert.alert('Payment Error', sdkErr.message);
      }
    }
  };

  if (showSummary) {
    const holding = holdingsList && holdingsList.length > 0 ? holdingsList[0] : null;
    const csName = holding?.cold_storage || 'Annsetu Storage Center';
    const bookingId = holding?.lot_id || 'BK-99210';
    const commodity = holding?.crop || farmerData?.commodity || 'Potato';
    const quantity = holding?.bags
      ? `${holding.bags} ${lang === 'en' ? 'Bags' : 'बोरी'}`
      : `350 ${lang === 'en' ? 'Bags' : 'बोरी'}`;

    const formatDateRangeAndDuration = (dateStr) => {
      if (!dateStr) return '';
      try {
        const amadDateObj = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today - amadDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        const formattedAmad = amadDateObj.toLocaleDateString('en-IN', options);
        const formattedToday = today.toLocaleDateString('en-IN', options);

        return `${formattedAmad} - ${formattedToday} (${diffDays} ${lang === 'en' ? 'days' : 'दिन'})`;
      } catch (e) {
        return dateStr;
      }
    };

    const storageDuration = holding?.amadDate
      ? formatDateRangeAndDuration(holding.amadDate)
      : `${formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))} - ${formatDate(new Date())} (30 ${lang === 'en' ? 'days' : 'दिन'})`;

    return (
      <View style={styles.container}>
        {/* ─── Top Header ─── */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.brandTitle}>Annsetu</Text>
          </View>
          <View style={styles.headerLangToggle}>
            <TouchableOpacity
              style={[styles.headerLangButton, lang === 'en' && styles.headerLangButtonActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.headerLangText, lang === 'en' && styles.headerLangTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerLangButton, lang === 'hi' && styles.headerLangButtonActive]}
              onPress={() => setLang('hi')}
            >
              <Text style={[styles.headerLangText, lang === 'hi' && styles.headerLangTextActive]}>हि</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back button link */}
          <TouchableOpacity
            style={styles.backLinkRow}
            activeOpacity={0.7}
            onPress={() => setShowSummary(false)}
          >
            <Feather name="arrow-left" size={16} color="#2D6A4F" style={{ marginRight: 6 }} />
            <Text style={styles.backLinkText}>{lang === 'en' ? 'Back to Khata' : 'खाता पर वापस जाएं'}</Text>
          </TouchableOpacity>

          <Text style={styles.summaryPageTitle}>{lang === 'en' ? 'Payment Summary' : 'भुगतान सारांश'}</Text>

          <View style={styles.summaryDetailsCard}>
            <View style={styles.summaryDetailItem}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Cold Storage' : 'कोल्ड स्टोरेज'}</Text>
              <Text style={styles.detailValue}>{csName}</Text>
            </View>

            <View style={styles.summaryDetailItem}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Booking ID' : 'बुकिंग आईडी'}</Text>
              <Text style={styles.detailValue}>{bookingId}</Text>
            </View>

            <View style={styles.summaryDetailItem}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Commodity' : 'फसल'}</Text>
              <Text style={styles.detailValue}>{commodity}</Text>
            </View>

            <View style={styles.summaryDetailItem}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Quantity' : 'मात्रा'}</Text>
              <Text style={styles.detailValue}>{quantity}</Text>
            </View>

            <View style={styles.summaryDetailItem}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Storage Duration' : 'भंडारण अवधि'}</Text>
              <Text style={styles.detailValue}>{storageDuration}</Text>
            </View>

            <View style={styles.summaryDetailItem}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Payment Amount' : 'भुगतान राशि'}</Text>
              <Text style={[styles.detailValue, { color: '#DC2626' }]}>
                ₹{pendingRent.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={[styles.summaryDetailItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Payment Status' : 'भुगतान की स्थिति'}</Text>
              <View style={styles.statusBadgeContainer}>
                <Feather name="clock" size={13} color="#B45309" style={{ marginRight: 6 }} />
                <Text style={styles.statusBadgeText}>
                  {lang === 'en' ? 'Pending Verification' : 'सत्यापन लंबित'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.8}
            onPress={handleOnlineCheckout}
          >
            <Text style={styles.doneBtnText}>
              {lang === 'en' ? 'Pay Now' : 'अभी भुगतान करें'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.alreadyPaidBtn}
            activeOpacity={0.8}
            onPress={() => {
              setShowSummary(false);
              setShowVerificationForm(true);
            }}
          >
            <Text style={styles.alreadyPaidBtnText}>
              {lang === 'en' ? 'Already Paid' : 'पहले ही भुगतान कर दिया'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (showVerificationForm) {
    const holding = holdingsList && holdingsList.length > 0 ? holdingsList[0] : null;
    const bookingId = holding?.lot_id || 'BK-99210';

    const handleFormSubmit = async () => {
      if (!utrNumber.trim()) {
        Alert.alert(
          lang === 'en' ? 'Required Field' : 'आवश्यक फ़ील्ड',
          lang === 'en' ? 'Please enter the UTR/Transaction ID.' : 'कृपया यूटीआर/लेनदेन आईडी दर्ज करें।'
        );
        return;
      }
      if (!receiptFile) {
        Alert.alert(
          lang === 'en' ? 'Required Field' : 'आवश्यक फ़ील्ड',
          lang === 'en' ? 'Please upload your payment receipt.' : 'कृपया अपनी भुगतान रसीद अपलोड करें।'
        );
        return;
      }

      try {
        const targetUrl = `${BACKEND_URL}/api/payments/verify`;
        const requestBody = {
          paymentId: paymentId,
          utrNumber: utrNumber,
          receiptFile: receiptFile,
          paymentDate: paymentDate,
        };
        console.log('[KhataTab] Submitting manual verification details to:', targetUrl);

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        console.log('[KhataTab] verifyPayment response status:', response.status, 'data:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit verification details.');
        }

        setVerificationStep(2);
        setVerificationSuccessModalVisible(true);
      } catch (err) {
        console.warn('[KhataTab] verifyPayment failed:', err.message);
        Alert.alert('Error', err.message);
      }
    };

    const handleResetAll = () => {
      setUtrNumber('');
      setReceiptFile('');
      setReceiptFileName('');
      setPaymentDate(new Date());
      setVerificationStep(1);
      setShowVerificationForm(false);
      setShowSummary(false);
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    };

    return (
      <View style={styles.container}>
        {/* ─── Top Header ─── */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.brandTitle}>Annsetu</Text>
          </View>
          <View style={styles.headerLangToggle}>
            <TouchableOpacity
              style={[styles.headerLangButton, lang === 'en' && styles.headerLangButtonActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.headerLangText, lang === 'en' && styles.headerLangTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerLangButton, lang === 'hi' && styles.headerLangButtonActive]}
              onPress={() => setLang('hi')}
            >
              <Text style={[styles.headerLangText, lang === 'hi' && styles.headerLangTextActive]}>हि</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {verificationStep === 1 ? (
            <View>
              {/* Back to Payment Summary link */}
              <TouchableOpacity
                style={styles.backLinkRow}
                activeOpacity={0.7}
                onPress={() => {
                  setShowVerificationForm(false);
                  setShowSummary(true);
                }}
              >
                <Feather name="arrow-left" size={16} color="#2D6A4F" style={{ marginRight: 6 }} />
                <Text style={styles.backLinkText}>
                  {lang === 'en' ? 'Back to Summary' : 'सारांश पर वापस जाएं'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.summaryPageTitle}>
                {lang === 'en' ? 'Payment Verification Details' : 'भुगतान सत्यापन विवरण'}
              </Text>

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
                    onPress={handleUploadReceipt}
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
                  onPress={() => {
                    setPickerDay(paymentDate.getDate());
                    setPickerMonth(paymentDate.getMonth());
                    setPickerYear(paymentDate.getFullYear());
                    setDatePickerVisible(true);
                  }}
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
                onPress={handleFormSubmit}
              >
                <Text style={styles.doneBtnText}>
                  {lang === 'en' ? 'Submit' : 'जमा करें'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 20 }}>
              <View style={styles.successIconWrapper}>
                <Feather name="check-circle" size={64} color="#16A34A" />
              </View>

              <Text style={styles.successHeading}>
                {lang === 'en' ? 'Submitted Successfully' : 'सफलतापूर्वक जमा किया गया'}
              </Text>

              <Text style={styles.successSubheading}>
                {lang === 'en'
                  ? 'Your payment verification request has been submitted.'
                  : 'आपका भुगतान सत्यापन अनुरोध जमा कर दिया गया है।'}
              </Text>

              <View style={styles.summaryDetailsCard}>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.detailLabel}>{lang === 'en' ? 'Booking ID' : 'बुकिंग आईडी'}</Text>
                  <Text style={styles.detailValue}>{bookingId}</Text>
                </View>

                <View style={styles.summaryDetailItem}>
                  <Text style={styles.detailLabel}>{lang === 'en' ? 'UTR / Transaction ID' : 'यूटीआर / लेनदेन आईडी'}</Text>
                  <Text style={styles.detailValue}>{utrNumber}</Text>
                </View>

                <View style={styles.summaryDetailItem}>
                  <Text style={styles.detailLabel}>{lang === 'en' ? 'Payment Amount' : 'भुगतान राशि'}</Text>
                  <Text style={[styles.detailValue, { color: '#DC2626' }]}>
                    ₹{pendingRent.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={[styles.summaryDetailItem, { borderBottomWidth: 0 }]}>
                  <Text style={styles.detailLabel}>{lang === 'en' ? 'Payment Status' : 'भुगतान की स्थिति'}</Text>
                  <View style={styles.statusBadgeContainer}>
                    <Feather name="clock" size={13} color="#B45309" style={{ marginRight: 6 }} />
                    <Text style={styles.statusBadgeText}>
                      {lang === 'en' ? 'Pending Verification' : 'सत्यापन लंबित'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.8}
                onPress={handleResetAll}
              >
                <Text style={styles.doneBtnText}>
                  {lang === 'en' ? 'Done' : 'पूर्ण'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal
          visible={datePickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDatePickerVisible(false)}
          >
            <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
              <Text style={styles.datePickerTitle}>
                {lang === 'en' ? 'Select Payment Date' : 'भुगतान तिथि चुनें'}
              </Text>

              <View style={styles.datePickerSelectorsRow}>
                {/* Day Column */}
                <View style={styles.datePickerCol}>
                  <TouchableOpacity onPress={() => adjustDay(1)} style={styles.datePickerArrow}>
                    <Feather name="chevron-up" size={20} color="#1E4032" />
                  </TouchableOpacity>
                  <Text style={styles.datePickerVal}>{pickerDay.toString().padStart(2, '0')}</Text>
                  <Text style={styles.datePickerColLabel}>{lang === 'en' ? 'Day' : 'दिन'}</Text>
                  <TouchableOpacity onPress={() => adjustDay(-1)} style={styles.datePickerArrow}>
                    <Feather name="chevron-down" size={20} color="#1E4032" />
                  </TouchableOpacity>
                </View>

                {/* Month Column */}
                <View style={styles.datePickerCol}>
                  <TouchableOpacity onPress={() => adjustMonth(1)} style={styles.datePickerArrow}>
                    <Feather name="chevron-up" size={20} color="#1E4032" />
                  </TouchableOpacity>
                  <Text style={styles.datePickerVal}>
                    {lang === 'en' ? months[pickerMonth] : monthsHindi[pickerMonth]}
                  </Text>
                  <Text style={styles.datePickerColLabel}>{lang === 'en' ? 'Month' : 'महीना'}</Text>
                  <TouchableOpacity onPress={() => adjustMonth(-1)} style={styles.datePickerArrow}>
                    <Feather name="chevron-down" size={20} color="#1E4032" />
                  </TouchableOpacity>
                </View>

                {/* Year Column */}
                <View style={styles.datePickerCol}>
                  <TouchableOpacity onPress={() => adjustYear(1)} style={styles.datePickerArrow}>
                    <Feather name="chevron-up" size={20} color="#1E4032" />
                  </TouchableOpacity>
                  <Text style={styles.datePickerVal}>{pickerYear}</Text>
                  <Text style={styles.datePickerColLabel}>{lang === 'en' ? 'Year' : 'वर्ष'}</Text>
                  <TouchableOpacity onPress={() => adjustYear(-1)} style={styles.datePickerArrow}>
                    <Feather name="chevron-down" size={20} color="#1E4032" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={styles.datePickerCancelBtn}
                  onPress={() => setDatePickerVisible(false)}
                >
                  <Text style={styles.datePickerCancelText}>{lang === 'en' ? 'Cancel' : 'रद्द करें'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.datePickerConfirmBtn}
                  onPress={handleConfirmDate}
                >
                  <Text style={styles.datePickerConfirmText}>{lang === 'en' ? 'Confirm' : 'पुष्टि करें'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Verification Success Modal */}
        <Modal
          visible={verificationSuccessModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setVerificationSuccessModalVisible(false);
            handleResetAll();
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setVerificationSuccessModalVisible(false);
              handleResetAll();
            }}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Feather name="check-circle" size={48} color="#16A34A" style={{ marginBottom: 16 }} />
              <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 12 }]}>
                {lang === 'en' ? 'Submitted' : 'जमा हो गया'}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#4B5563',
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 20,
                fontFamily: FONTS.regular
              }}>
                {lang === 'en'
                  ? 'Thank you! Your payment details have been submitted. Verification is in progress.'
                  : 'धन्यवाद! आपके भुगतान का विवरण जमा कर दिया गया है। सत्यापन प्रगति पर है।'}
              </Text>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                activeOpacity={0.8}
                onPress={() => {
                  setVerificationSuccessModalVisible(false);
                  handleResetAll();
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>{lang === 'en' ? 'OK' : 'ठीक है'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
        <View style={styles.headerLangToggle}>
          <TouchableOpacity
            style={[styles.headerLangButton, lang === 'en' && styles.headerLangButtonActive]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.headerLangText, lang === 'en' && styles.headerLangTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerLangButton, lang === 'hi' && styles.headerLangButtonActive]}
            onPress={() => setLang('hi')}
          >
            <Text style={[styles.headerLangText, lang === 'hi' && styles.headerLangTextActive]}>हि</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── Net Balance Red Gradient Card ─── */}
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>{lang === 'en' ? 'Net Balance' : 'शेष राशि'}</Text>
          <Text style={styles.balanceAmount}>
            ₹{pendingRent.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.balanceSub}>{lang === 'en' ? 'Dues Pending' : 'देनदारी बाकी'}</Text>

          {/* Buttons inside Red Card */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.btnStatement}
              activeOpacity={0.8}
              onPress={() => Alert.alert(lang === 'en' ? 'Download Statement' : 'स्टेटमेंट डाउनलोड करें', lang === 'en' ? 'Downloading PDF statement...' : 'पीडीएफ स्टेटमेंट डाउनलोड किया जा रहा है...')}
            >
              <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnStatementText}>{lang === 'en' ? 'Statement' : 'विवरण'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPay}
              activeOpacity={0.9}
              onPress={handlePayPress}
            >
              <Text style={styles.btnPayText}>{lang === 'en' ? 'Pay' : 'भुगतान करें'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ─── Total Charged & Paid Small Cards ─── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{lang === 'en' ? 'Total Charged' : 'कुल शुल्क'}</Text>
            <Text style={styles.summaryValue}>₹{totalCharged.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{lang === 'en' ? 'Total Paid' : 'कुल भुगतान'}</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* ─── Ledger Entries Section Header ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{lang === 'en' ? 'Ledger Entries' : 'खाता विवरण'}</Text>
          <TouchableOpacity style={styles.filterLink} activeOpacity={0.7}>
            <Text style={styles.filterLinkText}>{lang === 'en' ? 'Filter >' : 'फ़िल्टर >'}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Ledger List Card Block ─── */}
        <View style={styles.ledgerBlock}>
          {ledgerList.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="book-open" size={32} color="#A1A1AA" style={{ marginBottom: 12 }} />
              <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 16 }}>
                {lang === 'en'
                  ? `No ledger transactions found in the database for this ${userRole === 'coldstorage' ? 'cold storage' : 'farmer'}.`
                  : `इस ${userRole === 'coldstorage' ? 'कोल्ड स्टोरेज' : 'किसान'} के लिए डेटाबेस में कोई खाता लेनदेन नहीं मिला।`
                }
              </Text>
            </View>
          ) : (
            ledgerList.map((item, idx) => {
              const isNegative = item.amount < 0;
              const showBorder = idx !== ledgerList.length - 1;

              return (
                <View key={item.id} style={[styles.ledgerRow, showBorder && styles.rowBorder]}>
                  {/* Left Side: Title and Date */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                  </View>

                  {/* Right Side: Amount and Running Balance */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowAmount, { color: isNegative ? '#EF4444' : '#16A34A' }]}>
                      {formatPrice(item.amount)}
                    </Text>
                    <Text style={[styles.rowBalance, { color: '#71717A' }]}>
                      {lang === 'en' ? 'Bal: ' : 'शेष: '}₹{Math.abs(item.balance).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ─── WebView Hosted Payment Gateway Modal ─── */}
      <Modal
        visible={!!paymentUrl}
        animationType="slide"
        onRequestClose={() => setPaymentUrl(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF7F0' }}>
          <View style={styles.webHeader}>
            <TouchableOpacity
              style={styles.btnClosePayment}
              onPress={() => {
                setPaymentUrl(null);
                setShowSummary(false);
                if (onPaymentSuccess) {
                  onPaymentSuccess();
                }
              }}
              activeOpacity={0.8}
            >
              <Feather name="x" size={24} color="#1E5C2E" />
            </TouchableOpacity>
            <Text style={styles.webHeaderTitle}>
              {lang === 'en' ? 'Complete Payment' : 'भुगतान पूरा करें'}
            </Text>
          </View>
          {paymentUrl && (
            <WebView
              source={{ uri: paymentUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <ActivityIndicator
                  color="#1E5C2E"
                  size="large"
                  style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] }}
                />
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FAF7F0',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B4332',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Red Balance Gradient Card
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.md,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#FEE2E2',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  balanceSub: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 4,
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  btnStatement: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnStatementText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnPay: {
    flex: 1.2,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  btnPayText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '850',
  },

  // Total Charged & Paid Small Cards Row
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '850',
    color: '#1A1A1A',
    marginTop: 6,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B4332',
  },
  filterLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777777',
  },

  // Ledger List Cards Block
  ledgerBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE3',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '750',
    color: '#1A1A1A',
  },
  rowDate: {
    fontSize: 11,
    color: '#777777',
    marginTop: 3,
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowBalance: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 64, 50, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E4032',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtonPrimary: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E4032',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  modalButtonTextPrimary: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  backLinkText: {
    fontSize: 14,
    color: '#2D6A4F',
    fontWeight: '700',
  },
  summaryPageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E4032',
    marginBottom: 20,
  },
  summaryDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    padding: 20,
    ...SHADOWS.md,
    marginBottom: 24,
  },
  summaryDetailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE3',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  doneBtn: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#1E4032',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    marginBottom: 12,
  },
  doneBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  alreadyPaidBtn: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#F5EDD6',
    borderWidth: 1,
    borderColor: '#EAD9B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  alreadyPaidBtnText: {
    fontSize: 14,
    color: '#2D6A4F',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  headerLangToggle: {
    flexDirection: 'row',
    backgroundColor: '#EAF2EB',
    borderRadius: 16,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  headerLangButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLangButtonActive: {
    backgroundColor: '#1E5C2E',
  },
  headerLangText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5C2E',
  },
  headerLangTextActive: {
    color: '#FFFFFF',
  },

  // Form Styles for Verification
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E4032',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  formInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A1A1A',
  },
  uploadAreaContainer: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2D6A4F',
    backgroundColor: '#F5EDD6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  uploadAreaTextMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E4032',
    textAlign: 'center',
    marginBottom: 4,
  },
  uploadAreaTextSub: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '600',
  },
  uploadedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAD9B0',
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  uploadedFileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  uploadedFileSub: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
    marginTop: 2,
  },
  clearFileBtn: {
    padding: 6,
  },
  dateSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  successIconWrapper: {
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E4032',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubheading: {
    fontSize: 14,
    color: '#7A7A7A',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    lineHeight: 20,
  },

  // Custom Date Picker Modal Styles
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxWidth: 320,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E4032',
    marginBottom: 20,
  },
  datePickerSelectorsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  datePickerCol: {
    alignItems: 'center',
    width: 64,
  },
  datePickerArrow: {
    padding: 6,
  },
  datePickerVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginVertical: 4,
  },
  datePickerColLabel: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 12,
  },
  datePickerCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerCancelText: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '600',
  },
  datePickerConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1E4032',
    borderRadius: 18,
  },
  datePickerConfirmText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FAF7F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E2D9',
  },
  btnClosePayment: {
    marginRight: 16,
  },
  webHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E5C2E',
  },
});
