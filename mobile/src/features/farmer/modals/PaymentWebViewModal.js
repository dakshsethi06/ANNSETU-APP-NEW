import React from 'react';
import { Modal, SafeAreaView, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import styles from '../styles/khataTabStyles';

export default function PaymentWebViewModal({ visible, paymentUrl, onClose, onPaymentSuccess }) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF7F0' }}>
        <View style={styles.webHeader}>
          <TouchableOpacity
            style={styles.btnClosePayment}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Feather name="x" size={24} color="#1E5C2E" />
          </TouchableOpacity>
          <Text style={styles.webHeaderTitle}>
            {t('khata.complete_payment')}
          </Text>
        </View>
        {paymentUrl ? (
          <WebView
            source={{ uri: paymentUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onNavigationStateChange={(navState) => {
              console.log('[WebView] Nav State URL Change:', navState.url);
              if (navState.url && navState.url.includes('/api/payments/success')) {
                if (onPaymentSuccess) {
                  console.log('[WebView] Success URL detected in onNavigationStateChange! Calling onPaymentSuccess...');
                  onPaymentSuccess();
                }
              }
            }}
            onLoadStart={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('[WebView] Load Start URL:', nativeEvent.url);
              if (nativeEvent.url && nativeEvent.url.includes('/api/payments/success')) {
                if (onPaymentSuccess) {
                  console.log('[WebView] Success URL detected in onLoadStart! Calling onPaymentSuccess...');
                  onPaymentSuccess();
                }
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              console.log('[WebView] Should Start Load Request URL:', request.url);
              if (request.url.includes('/api/payments/success')) {
                if (onPaymentSuccess) {
                  console.log('[WebView] Success URL detected in onShouldStartLoadWithRequest! Calling onPaymentSuccess...');
                  onPaymentSuccess();
                }
                return false; // Prevent loading the success HTML inside the WebView since we're closing it
              }
              return true;
            }}
            renderLoading={() => (
              <ActivityIndicator
                color="#1E5C2E"
                size="large"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] }}
              />
            )}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
