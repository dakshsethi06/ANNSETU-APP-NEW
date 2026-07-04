import React from 'react';
import { Modal, SafeAreaView, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

export default function PaymentWebViewModal({ visible, paymentUrl, lang, onClose }) {
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
            {lang === 'en' ? 'Complete Payment' : 'भुगतान पूरा करें'}
          </Text>
        </View>
        {paymentUrl ? (
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
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
