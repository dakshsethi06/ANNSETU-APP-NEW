import { useState } from 'react';
import { Alert, NativeModules } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { BACKEND_URL } from '../../../core/network/config';

export function useOnlinePayment(farmerData, lang, onPaymentSuccess, setShowSummary, setPaymentId) {
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [isOnlineSuccess, setIsOnlineSuccess] = useState(false);

  const handlePayPress = async (targetAmount) => {
    console.log('[useOnlinePayment] handlePayPress called with targetAmount:', targetAmount);
    try {
      const farmerId = farmerData?.id || farmerData?.serial_number;
      console.log('[useOnlinePayment] Using farmerId:', farmerId, 'and BACKEND_URL:', BACKEND_URL);
      
      const response = await fetch(`${BACKEND_URL}/api/payments/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId, amount: targetAmount })
      });
      
      console.log('[useOnlinePayment] API response status:', response.status);
      const orderData = await response.json();
      console.log('[useOnlinePayment] API orderData:', orderData);
      
      if (!orderData.success) throw new Error(orderData.error || 'Order generation failed.');

      setPaymentId(orderData.order_id);
      setRazorpayOrderData(orderData);
      setShowSummary(true);
      console.log('[useOnlinePayment] Successfully set order data and showSummary = true');
    } catch (err) {
      console.error('[useOnlinePayment] handlePayPress error:', err.message);
      Alert.alert('Error', err.message || 'Failed to initiate payment.');
    }
  };

  const handleOnlineCheckout = async () => {
    console.log('[useOnlinePayment] handleOnlineCheckout triggered. Current razorpayOrderData:', razorpayOrderData);
    if (!razorpayOrderData) {
      console.warn('[useOnlinePayment] razorpayOrderData is null or empty!');
      return Alert.alert('Error', 'Payment details not loaded.');
    }

    const isMock = razorpayOrderData.order_id?.startsWith('order_mock_');
    const hasNativeSDK = !!NativeModules.RazorpayCheckout;
    console.log('[useOnlinePayment] isMock:', isMock, 'hasNativeSDK:', hasNativeSDK);

    if (isMock || !hasNativeSDK || !RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      console.log('[useOnlinePayment] Mock mode or Native SDK not available. Falling back to WebView.');
      if (razorpayOrderData.payment_link_url) {
        console.log('[useOnlinePayment] Setting paymentUrl to:', razorpayOrderData.payment_link_url);
        setPaymentUrl(razorpayOrderData.payment_link_url);
        return;
      }
      console.error('[useOnlinePayment] payment_link_url is missing!');
      return Alert.alert('Error', 'Payment link URL not generated.');
    }

    try {
      console.log('[useOnlinePayment] Opening Native Razorpay SDK...');
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
        console.log('[useOnlinePayment] Razorpay SDK checkout success:', data);
        const verifyRes = await fetch(`${BACKEND_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature
          })
        });
        const verifyData = await verifyRes.json();
        console.log('[useOnlinePayment] Verification API result:', verifyData);
        if (!verifyData.success) throw new Error(verifyData.message || 'Signature rejected.');

        Alert.alert(
          lang === 'en' ? 'Payment Successful' : 'भुगतान सफल',
          lang === 'en' ? 'Your dues have been cleared.' : 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।',
          [{ text: 'OK', onPress: () => { setShowSummary(false); if (onPaymentSuccess) onPaymentSuccess(); } }]
        );
      }).catch((error) => {
        console.warn('[useOnlinePayment] Razorpay SDK checkout failed or cancelled:', error);
        if (razorpayOrderData.payment_link_url) {
          console.log('[useOnlinePayment] Falling back to web view on error:', razorpayOrderData.payment_link_url);
          setPaymentUrl(razorpayOrderData.payment_link_url);
        } else {
          Alert.alert('Payment Failed', (error && (error.description || error.message)) || 'Payment failed.');
        }
      });
    } catch (sdkErr) {
      console.error('[useOnlinePayment] SDK Exception:', sdkErr.message);
      if (razorpayOrderData.payment_link_url) setPaymentUrl(razorpayOrderData.payment_link_url);
    }
  };

  return {
    paymentUrl, setPaymentUrl,
    razorpayOrderData, setRazorpayOrderData,
    isOnlineSuccess, setIsOnlineSuccess,
    handlePayPress, handleOnlineCheckout
  };
}
