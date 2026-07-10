import React from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../../core/theme/theme';

export default function ChatbotWebViewModal({ visible, onClose }) {
  const chatbotUrl = process.env.EXPO_PUBLIC_BOTPRESS_CHATBOT_URL;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.safeArea}>
        {/* Status Bar Spacer for Android */}
        {Platform.OS === 'android' && (
          <View style={{ height: StatusBar.currentHeight, backgroundColor: '#FAF7F0' }} />
        )}

        {/* Header bar */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Feather name="arrow-left" size={24} color={COLORS.greenDeep || '#1E5C2E'} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Annsetu AI Assistant / एआई सहायक</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* WebView content */}
        {chatbotUrl ? (
          <WebView
            source={{ uri: chatbotUrl }}
            style={s.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator
                color={COLORS.greenDeep || '#1E5C2E'}
                size="large"
                style={s.loadingIndicator}
              />
            )}
          />
        ) : (
          <View style={s.errorContainer}>
            <Feather name="alert-triangle" size={48} color="#DC2626" />
            <Text style={s.errorText}>
              Chatbot is not configured yet. Please set EXPO_PUBLIC_BOTPRESS_CHATBOT_URL in environment variables.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E2D9',
    backgroundColor: '#FAF7F0',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.greenDeep || '#1E5C2E',
  },
  webview: {
    flex: 1,
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAF7F0',
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
});
