import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../../core/theme/theme';
import { StyleSheet } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function LiveChatTab({ userName, userPhone }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatTicketId, setChatTicketId] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'error'
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollingRef = useRef(null);
  const [isAgentBusy, setIsAgentBusy] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [clockTick, setClockTick] = useState(0);

  // Auto-refresh every 30s so offline/online transitions happen live
  useEffect(() => {
    const timer = setInterval(() => setClockTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Monitor agent response delay to show busy banner
  useEffect(() => {
    if (status !== 'connected') {
      setIsAgentBusy(false);
      return;
    }

    const hasAgentMsg = messages.some(m => m.sender === 'agent');
    if (hasAgentMsg) {
      setIsAgentBusy(false);
      return;
    }

    // Set a timer for 1 minute (60,000ms) to show the busy banner if no agent has replied
    const timer = setTimeout(() => {
      setIsAgentBusy(true);
    }, 60000);

    return () => clearTimeout(timer);
  }, [status, messages]);

  // Check for active open support chat on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!userPhone) return;
      try {
        setStatus('connecting');
        const response = await fetch(`${BACKEND_URL}/api/support/chat/active?phone=${encodeURIComponent(userPhone)}`);
        const data = await response.json();
        if (data.success && data.active && data.ticketId) {
          setChatTicketId(data.ticketId);
          setStatus('connected');
          
          const subject = data.subject || '';
          const topic = subject.split(' - ')[0] || 'Support';
          setMessages([
            {
              id: 'welcome',
              text: `Welcome back! Restoring your active session for: "${topic}".`,
              sender: 'system',
              time: new Date().toISOString(),
            }
          ]);
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.warn('[LiveChat] Check active session error:', err.message);
        setStatus('idle');
      }
    };

    checkActiveSession();
  }, [userPhone]);

  // Start a new chat session
  const startChat = useCallback(async (option = 'General Support') => {
    setStatus('connecting');
    try {
      const response = await fetch(`${BACKEND_URL}/api/support/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName || 'App User',
          phone: userPhone || undefined,
          subject: `${option} - ${userName || 'App User'}`,
          description: `Live chat session started with query: "${option}" by ${userName || 'App User'} (Phone: ${userPhone || 'N/A'})`,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setChatTicketId(data.ticketId);
        setStatus('connected');
        // Add a system welcome message + user's initial selection message
        setMessages([
          {
            id: 'welcome',
            text: `Welcome! An agent will join shortly to help you with: "${option}". Please describe your issue.`,
            sender: 'system',
            time: new Date().toISOString(),
          },
          {
            id: 'init-msg',
            text: `I need help regarding: ${option}`,
            sender: 'user',
            time: new Date().toISOString(),
          }
        ]);
      } else {
        throw new Error(data.message || 'Could not start chat.');
      }
    } catch (err) {
      console.error('[LiveChat] Start error:', err.message);
      setStatus('error');
    }
  }, [userName, userPhone]);

  // Send a message
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !chatTicketId || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    Keyboard.dismiss();

    // Optimistically add the message to UI
    const tempMsg = {
      id: `temp-${Date.now()}`,
      text: messageText,
      sender: 'user',
      time: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch(`${BACKEND_URL}/api/support/chat/${chatTicketId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          senderName: userName || 'App User',
        }),
      });
    } catch (err) {
      console.error('[LiveChat] Send error:', err.message);
    } finally {
      setSending(false);
    }
  }, [inputText, chatTicketId, sending, userName]);

  // Pick and send an image
  const handlePickImage = async () => {
    if (!chatTicketId || sending) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const sizeInMb = selectedAsset.size / (1024 * 1024);
        if (sizeInMb > 5) {
          Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
          return;
        }

        setSending(true);
        const response = await fetch(selectedAsset.uri);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result;
          if (typeof base64Data === 'string') {
            const base64 = base64Data.split(',')[1];
            
            try {
              // Optimistically add attachment to UI
              const tempMsg = {
                id: `temp-${Date.now()}`,
                text: `[Attachment: ${selectedAsset.uri}]`,
                sender: 'user',
                time: new Date().toISOString(),
              };
              setMessages(prev => [...prev, tempMsg]);

              await fetch(`${BACKEND_URL}/api/support/chat/${chatTicketId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: '',
                  senderName: userName || 'App User',
                  attachment: {
                    name: selectedAsset.name,
                    type: selectedAsset.mimeType || 'image/jpeg',
                    base64: base64
                  }
                }),
              });
            } catch (err) {
              console.error('[LiveChat] Image send error:', err.message);
              Alert.alert('Send Failed', 'Could not upload image. Please try again.');
            } finally {
              setSending(false);
            }
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      Alert.alert('Error', 'An error occurred while picking image.');
    }
  };

  // End active support chat session
  const confirmEndChat = () => {
    Alert.alert(
      'End Support Chat',
      'Are you sure you want to end this live support session? This will resolve the ticket in Zoho Desk.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, End', style: 'destructive', onPress: endChat },
      ]
    );
  };

  const endChat = async () => {
    if (!chatTicketId) return;
    try {
      setStatus('connecting');
      const response = await fetch(`${BACKEND_URL}/api/support/chat/${chatTicketId}/close`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setChatTicketId(null);
        setMessages([]);
        setStatus('idle');
      } else {
        Alert.alert('Error', data.message || 'Failed to end support chat.');
        setStatus('connected');
      }
    } catch (err) {
      console.error('[LiveChat] End error:', err.message);
      Alert.alert('Error', 'An error occurred while ending the support session.');
      setStatus('connected');
    }
  };

  // Handle support chat feedback rating
  const handleFeedback = async (rating) => {
    try {
      await fetch(`${BACKEND_URL}/api/support/chat/${chatTicketId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, senderName: userName }),
      });
      Alert.alert('Rating Submitted', 'Thank you for your valuable feedback!');
    } catch (err) {
      console.warn('[LiveChat] Feedback error:', err.message);
    } finally {
      setChatTicketId(null);
      setMessages([]);
      setShowFeedback(false);
      setStatus('idle');
    }
  };

  const skipFeedback = () => {
    setChatTicketId(null);
    setMessages([]);
    setShowFeedback(false);
    setStatus('idle');
  };

  // Poll for new messages from agent
  useEffect(() => {
    if (status !== 'connected' || !chatTicketId || showFeedback) return;

    const pollMessages = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/support/chat/${chatTicketId}/messages`
        );
        const data = await response.json();
        if (data.success) {
          // If the agent resolved the ticket, stop polling and display the feedback screen
          if (data.status && data.status.toLowerCase() === 'closed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setShowFeedback(true);
            return;
          }

          if (data.messages) {
          setMessages(prev => {
            const apiMsgs = data.messages || [];
            
            const hasJoinedMsg = apiMsgs.some(apiM => apiM.sender === 'system' && apiM.text.includes('joined the chat'));

            // Keep system messages and temporary unsaved local user messages
            const systemAndTempMsgs = prev.filter(m => {
              if (m.id === 'welcome') {
                return !hasJoinedMsg; // Hide welcome message if agent has joined
              }
              if (m.id.startsWith('temp-')) {
                // If it's a temporary attachment message, check if the API response contains any new user attachments
                if (m.text && m.text.startsWith('[Attachment:')) {
                  const hasSavedAttachment = apiMsgs.some(apiM => 
                    apiM.sender === 'user' && 
                    apiM.text && 
                    apiM.text.includes('[Attachment:')
                  );
                  return !hasSavedAttachment;
                }
                // If the API has already returned this message, discard the local temp one
                const isSaved = apiMsgs.some(apiM => apiM.sender === 'user' && apiM.text === m.text);
                return !isSaved;
              }
              return false; // Discard older API-loaded messages from prev, since they are replaced by fresh API array
            });

            // Combine and sort
            const allMsgs = [...systemAndTempMsgs, ...apiMsgs];
            allMsgs.sort((a, b) => new Date(a.time) - new Date(b.time));
            return allMsgs;
          });
        }
      }
    } catch (err) {
      // Silently fail on poll errors
    }
    };

    // Poll every 5 seconds
    pollingRef.current = setInterval(pollMessages, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, chatTicketId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length]);

  // ─── Feedback State: Prompt Satisfaction Rating after chat closed ───
  if (showFeedback) {
    return (
      <View style={cs.centerContainer}>
        <View style={cs.startChatCard}>
          <Feather name="smile" size={48} color={COLORS.greenMid} style={{ marginBottom: 12 }} />
          <Text style={cs.startTitle}>Support Chat Resolved</Text>
          <Text style={cs.startSubtitle}>
            Your support session has ended. How would you rate the service provided by our agent?
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '45%',
                paddingVertical: 18,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                backgroundColor: '#E8F5E9',
                borderColor: '#A5D6A7'
              }}
              onPress={() => handleFeedback('Good')}
              activeOpacity={0.8}
            >
              <Feather name="smile" size={24} color="#2E7D32" style={{ marginBottom: 6 }} />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#2E7D32' }}>Good</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '45%',
                paddingVertical: 18,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                backgroundColor: '#FFEBEE',
                borderColor: '#EF9A9A'
              }}
              onPress={() => handleFeedback('Bad')}
              activeOpacity={0.8}
            >
              <Feather name="frown" size={24} color="#C62828" style={{ marginBottom: 6 }} />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#C62828' }}>Bad</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={skipFeedback}
            style={{ marginTop: 24 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMid }}>Skip Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Idle State: Show Start Chat options or Offline Card ───
  if (status === 'idle') {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isOffline = day === 0 || day === 6 || hour < 9 || hour >= 22;

    if (isOffline) {
      return (
        <View style={cs.centerContainer}>
          <View style={cs.startChatCard}>
            <Feather name="moon" size={48} color={COLORS.amber} style={{ marginBottom: 12 }} />
            <Text style={cs.startTitle}>Support is Offline</Text>
            <Text style={cs.startSubtitle}>
              Our live support chat is available between{"\n"}
              <Text style={{ fontFamily: FONTS.bold, color: COLORS.greenDeep }}>9:00 AM and 10:00 PM (Mon - Fri)</Text>.
            </Text>
            <Text style={[cs.startSubtitle, { marginTop: 12 }]}>
              Please leave a message by creating a ticket in the **"New Ticket"** tab, and our team will get back to you during operational hours!
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={cs.centerContainer}>
        <View style={cs.startChatCard}>
          <Feather name="message-circle" size={48} color={COLORS.greenMid} style={{ marginBottom: 4 }} />
          <Text style={cs.startTitle}>Support Chat</Text>
          <Text style={cs.startSubtitle}>
            How can we help you today? Select an option below to connect with a support agent:
          </Text>

          <View style={cs.optionsContainer}>
            <TouchableOpacity
              style={cs.optionRow}
              onPress={() => startChat('Stock & Lot Query')}
              activeOpacity={0.7}
            >
              <View style={cs.optionLeft}>
                <Feather name="package" size={18} color={COLORS.greenDeep} style={{ marginRight: 12 }} />
                <Text style={cs.optionText}>Stock & Lot Queries</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={cs.optionRow}
              onPress={() => startChat('Payment & Rent Query')}
              activeOpacity={0.7}
            >
              <View style={cs.optionLeft}>
                <Feather name="credit-card" size={18} color={COLORS.greenDeep} style={{ marginRight: 12 }} />
                <Text style={cs.optionText}>Payment & Rent Queries</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={cs.optionRow}
              onPress={() => startChat('MPIN & Login Issue')}
              activeOpacity={0.7}
            >
              <View style={cs.optionLeft}>
                <Feather name="key" size={18} color={COLORS.greenDeep} style={{ marginRight: 12 }} />
                <Text style={cs.optionText}>MPIN & Login Issues</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={cs.optionRow}
              onPress={() => startChat('Talk to Live Agent')}
              activeOpacity={0.7}
            >
              <View style={cs.optionLeft}>
                <Feather name="user" size={18} color={COLORS.greenDeep} style={{ marginRight: 12 }} />
                <Text style={cs.optionText}>Talk to Live Agent directly</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Connecting State ──────────────────────────────────────────
  if (status === 'connecting') {
    return (
      <View style={cs.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.greenMid} />
        <Text style={cs.connectingText}>Connecting to support agent...</Text>
        <Text style={cs.connectingSub}>Please wait</Text>
      </View>
    );
  }

  // ─── Error State ───────────────────────────────────────────────
  if (status === 'error') {
    return (
      <View style={cs.centerContainer}>
        <Feather name="alert-triangle" size={56} color={COLORS.errorRed} />
        <Text style={cs.errorText}>Could not connect</Text>
        <Text style={cs.errorSub}>Please check your connection and try again.</Text>
        <TouchableOpacity style={cs.retryBtn} onPress={startChat} activeOpacity={0.8}>
          <Text style={cs.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Connected: Chat UI ────────────────────────────────────────
  const renderMessage = ({ item }) => {
    if (item.sender === 'system') {
      return (
        <View style={cs.systemMsgContainer}>
          <Text style={cs.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    const isUser = item.sender === 'user';
    const attachmentRegex = /\[Attachment:\s*((https?|file):\/\/[^\s\]]+)\]/i;
    const match = item.text ? item.text.match(attachmentRegex) : null;
    const imageUrl = match ? match[1] : null;
    const cleanText = item.text ? item.text.replace(attachmentRegex, '').trim() : '';

    return (
      <View style={[cs.bubbleRow, isUser ? cs.bubbleRowUser : cs.bubbleRowAgent]}>
        {!isUser && (
          <View style={cs.agentAvatar}>
            <Feather name="headphones" size={14} color={COLORS.white} />
          </View>
        )}
        <View style={[cs.bubble, isUser ? cs.bubbleUser : cs.bubbleAgent]}>
          {!isUser && item.agentName && (
            <Text style={cs.agentName}>{item.agentName}</Text>
          )}
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: 200,
                height: 150,
                borderRadius: 8,
                marginBottom: cleanText ? 6 : 0,
              }}
              resizeMode="cover"
            />
          )}
          {(!imageUrl || cleanText.length > 0) && (
            <Text style={[cs.bubbleText, isUser && { color: COLORS.white }]}>
              {imageUrl ? cleanText : item.text}
            </Text>
          )}
          <Text style={[cs.bubbleTime, isUser && { color: 'rgba(255,255,255,0.7)' }]}>
            {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Chat Header */}
      <View style={[cs.chatHeader, { justifyContent: 'space-between', paddingHorizontal: 16, flexDirection: 'row' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={cs.chatHeaderDot} />
          <Text style={cs.chatHeaderText}>Connected to Support</Text>
        </View>
        <TouchableOpacity 
          onPress={confirmEndChat} 
          style={{
            backgroundColor: '#FFEBEE', 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#FFCDD2'
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: '#C62828' }}>End Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Offline/Busy Banner */}
      {(() => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const isOffline = day === 0 || day === 6 || hour < 9 || hour >= 22;
        if (isOffline) {
          return (
            <View style={[cs.busyBanner, { backgroundColor: '#ECEFF1', borderBottomColor: '#CFD8DC' }]}>
              <Feather name="moon" size={14} color="#455A64" style={{ marginRight: 6 }} />
              <Text style={[cs.busyBannerText, { color: '#37474F' }]}>
                Live support is currently offline (9:00 AM - 10:00 PM, Mon - Fri). Agents will respond when they return.
              </Text>
            </View>
          );
        }
        if (isAgentBusy) {
          return (
            <View style={cs.busyBanner}>
              <Feather name="clock" size={14} color="#B78103" style={{ marginRight: 6 }} />
              <Text style={cs.busyBannerText}>
                Our agents are busy assisting other users. Feel free to leave your message here and we will reply shortly!
              </Text>
            </View>
          );
        }
        return null;
      })()}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={cs.messagesContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Bar */}
      <View style={cs.inputBar}>
        <TouchableOpacity
          style={cs.attachBtn}
          onPress={handlePickImage}
          disabled={sending}
          activeOpacity={0.8}
        >
          <Feather name="paperclip" size={20} color={COLORS.greenMid} />
        </TouchableOpacity>
        <TextInput
          style={cs.textInput}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[cs.sendBtn, (!inputText.trim() || sending) && cs.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Feather name="send" size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Chat Styles ─────────────────────────────────────────────────
const cs = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: '#FAF7F0',
  },
  startChatCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  startTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.greenDeep,
    marginTop: SPACING.md,
  },
  startSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMid,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  optionsContainer: {
    width: '100%',
    marginTop: SPACING.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textDark,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenMid,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  startBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  connectingText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.greenDeep,
    marginTop: SPACING.md,
  },
  connectingSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  errorText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.errorRed,
    marginTop: SPACING.md,
  },
  errorSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMid,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.amber,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  retryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chatHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  chatHeaderText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.greenDeep,
    letterSpacing: 0.5,
  },
  messagesContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: '#FAF9F6',
  },
  systemMsgContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  systemMsgText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMid,
    backgroundColor: '#EAEAEA',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
    textAlign: 'center',
    overflow: 'hidden',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAgent: {
    justifyContent: 'flex-start',
  },
  agentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.greenMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: RADIUS.md,
    padding: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: COLORS.greenDeep,
    borderBottomRightRadius: 2,
  },
  bubbleAgent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderBottomLeftRadius: 2,
  },
  agentName: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.greenDeep,
    marginBottom: 4,
  },
  bubbleText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
  },
  bubbleTime: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: COLORS.textLight,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textDark,
    backgroundColor: '#F5F6F8',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.greenMid,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.greenMid,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#C8E6C9',
    shadowOpacity: 0,
    elevation: 0,
  },
  attachBtn: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
    borderBottomWidth: 1,
    borderBottomColor: '#FFF59D',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  busyBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#827717',
    flex: 1,
    lineHeight: 16,
  },
});
