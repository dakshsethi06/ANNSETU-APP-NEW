import { useState } from 'react';
import { Alert, NativeModules } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { BACKEND_URL } from '../../../core/network/config';

export function useOnlinePayment(farmerData, lang, onPaymentSuccess, setShowSummary, setPaymentId) {
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [isOnlineSuccess, setIsOnlineSuccess] = useState(false);

  const handlePayPress = async (targetAmount) => {
    try {
      const farmerId = farmerData?.id || farmerData?.serial_number;
      const response = await fetch(`${BACKEND_URL}/api/payments/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId, amount: targetAmount })
      });
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
    if (!razorpayOrderData) return Alert.alert('Error', 'Payment details not loaded.');

    const isMock = razorpayOrderData.order_id?.startsWith('order_mock_');
    const hasNativeSDK = !!NativeModules.RazorpayCheckout;

    if (isMock || !hasNativeSDK || !RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      if (razorpayOrderData.payment_link_url) return setPaymentUrl(razorpayOrderData.payment_link_url);
      return Alert.alert('Error', 'Payment link URL not generated.');
    }

    try {
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
        if (!verifyData.success) throw new Error(verifyData.message || 'Signature rejected.');

        Alert.alert(
          lang === 'en' ? 'Payment Successful' : 'भुगतान सफल',
          lang === 'en' ? 'Your dues have been cleared.' : 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।',
          [{ text: 'OK', onPress: () => { setShowSummary(false); if (onPaymentSuccess) onPaymentSuccess(); } }]
        );
      }).catch((error) => {
        if (razorpayOrderData.payment_link_url) setPaymentUrl(razorpayOrderData.payment_link_url);
        else Alert.alert('Payment Failed', (error && (error.description || error.message)) || 'Payment failed.');
      });
    } catch (sdkErr) {
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
