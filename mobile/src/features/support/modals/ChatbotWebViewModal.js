import React from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../../core/theme/theme';

export default function ChatbotWebViewModal({ visible, onClose }) {
  const orgId = process.env.EXPO_PUBLIC_ZOHO_ZIA_ORG_ID || "60077542507";
  const entityId = process.env.EXPO_PUBLIC_ZOHO_ZIA_ENTITY_ID || "1187000000010004";

  // Embed Zoho Zia Agent ChatKit inside HTML wrapper
  const chatbotHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #FAF7F0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            position: fixed !important;
          }
          #chat-container {
            width: 100%;
            height: 100%;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            overflow: hidden;
          }
          /* Force Zoho's chat container wrapper to fill the full screen and remain fixed */
          .agents-chat-bot {
            position: fixed !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 9999 !important;
            display: block !important;
            overflow: hidden !important;
          }
          .agents-chat-container {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            overflow: hidden !important;
          }
          /* Hide the floating launcher icon to avoid dual icons */
          .agents-chat-launcher {
            display: none !important;
          }
          /* Hide Zoho's internal close (X) button since we have our native back-arrow header */
          .agents-chat-close {
            display: none !important;
          }
          /* Stretch the message area */
          .agents-chat-body {
            border-radius: 0 !important;
          }
        </style>
        <script src="https://agents.zoho.in/resources/addon-chat/assets/js/agents-chat-sdk.js"></script>
      </head>
      <body>
        <div id="chat-container">
          <agents-chatkit ziaAgents='{"orgId":"${orgId}", "entityId":"${entityId}"}'></agents-chatkit>
        </div>
      </body>
    </html>
  `;

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

        {/* WebView content loading local HTML with Zoho Zia SDK */}
        <WebView
          source={{ html: chatbotHtml, baseUrl: 'https://agents.zoho.in' }}
          originWhitelist={['*']}
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
});
