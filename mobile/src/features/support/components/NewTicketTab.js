import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { s } from '../styles/SupportModal.styles';
import { COLORS, SPACING } from '../../../core/theme/theme';
import { createSupportTicket } from '../services/supportService';

const CATEGORIES = [
  { id: 'storage', labelEn: 'Crop Storage' },
  { id: 'payment', labelEn: 'Payment / Fees' },
  { id: 'mandi', labelEn: 'Mandi Rates' },
  { id: 'app', labelEn: 'App Problems' },
  { id: 'other', labelEn: 'Other Issue' }
];

export default function NewTicketTab({ userName, userPhone, userRole, onClose, onRefreshHistory }) {
  const [category, setCategory] = useState('storage');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [attachments, setAttachments] = useState([]);

  const displayPhone = userPhone || 'Not logged in';

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Required Field', 'Please enter a subject for your request.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a description of the issue.');
      return;
    }

    setStatus('submitting');
    try {
      const response = await createSupportTicket({
        name: userName || 'App User',
        phone: userPhone || undefined,
        category: CATEGORIES.find(c => c.id === category)?.labelEn || 'Other',
        subject: subject,
        description: description,
        role: userRole || 'Farmer',
        attachments: attachments.map(a => ({
          name: a.name,
          type: a.type,
          base64: a.base64
        }))
      });

      if (response.success) {
        setTicketId(response.ticketId);
        setStatus('success');
        if (onRefreshHistory) onRefreshHistory();
      } else {
        throw new Error(response.message || 'Could not submit support ticket.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const sizeInMb = selectedAsset.size / (1024 * 1024);
        if (sizeInMb > 5) {
          Alert.alert('File Too Large', 'Please select a file smaller than 5MB.');
          return;
        }

        const response = await fetch(selectedAsset.uri);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result;
          if (typeof base64Data === 'string') {
            const base64 = base64Data.split(',')[1];
            setAttachments(prev => [
              ...prev,
              {
                name: selectedAsset.name,
                size: selectedAsset.size,
                type: selectedAsset.mimeType || 'application/octet-stream',
                base64: base64
              }
            ]);
          }
        };
        reader.onerror = () => {
          Alert.alert('Error', 'Failed to read file content.');
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.warn('Document picker error:', err);
      Alert.alert('Error', 'An error occurred while picking document.');
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  if (status === 'submitting') {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.greenMid} />
        <Text style={s.loadingText}>Submitting support ticket...</Text>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={s.centerContainer}>
        <View style={s.successBadge}>
          <Feather name="check-circle" size={64} color={COLORS.greenMid} />
        </View>
        <Text style={s.successTitle}>Ticket Registered</Text>
        <Text style={s.ticketIdText}>Ticket ID: #{ticketId}</Text>
        
        <View style={s.successCard}>
          <Text style={s.successInfoLabel}>Registered Phone:</Text>
          <Text style={s.successInfoValue}>{displayPhone}</Text>
          <Text style={s.successCardSub}>
            Our agent will review your request and get in touch with you shortly.
          </Text>
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={s.doneBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={s.centerContainer}>
        <View style={s.errorBadge}>
          <Feather name="alert-triangle" size={64} color={COLORS.errorRed} />
        </View>
        <Text style={s.errorTitle}>Submission Failed</Text>
        <Text style={s.errorDescription}>{errorMessage}</Text>

        <TouchableOpacity style={s.retryBtn} onPress={() => setStatus('idle')} activeOpacity={0.8}>
          <Text style={s.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.cancelTextBtn} onPress={onClose}>
          <Text style={s.cancelTextBtnLabel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={s.contextCard}>
        <View style={s.contextRow}>
          <Feather name="user" size={16} color={COLORS.greenMid} style={{ marginRight: 8 }} />
          <Text style={s.contextText}>
            Logging ticket as: <Text style={{ fontWeight: 'bold' }}>{userName || 'Annsetu User'}</Text>
          </Text>
        </View>
        <View style={[s.contextRow, { marginTop: SPACING.xs }]}>
          <Feather name="phone" size={16} color={COLORS.greenMid} style={{ marginRight: 8 }} />
          <Text style={s.contextText}>
            Contact: <Text style={{ fontWeight: 'bold' }}>{displayPhone}</Text>
          </Text>
        </View>
      </View>

      <Text style={s.fieldLabel}>Select Topic <Text style={{ color: COLORS.errorRed }}>*</Text></Text>
      <View style={s.categoryGrid}>
        {CATEGORIES.map(cat => {
          const active = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[s.categoryPill, active && s.categoryPillActive]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Text style={[s.categoryPillText, active && s.categoryPillTextActive]}>
                {cat.labelEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.fieldLabel}>Subject <Text style={{ color: COLORS.errorRed }}>*</Text></Text>
      <TextInput
        style={s.input}
        placeholder="e.g. Rent payment issue"
        placeholderTextColor="#999"
        value={subject}
        onChangeText={setSubject}
        maxLength={80}
      />

      <Text style={s.fieldLabel}>Description <Text style={{ color: COLORS.errorRed }}>*</Text></Text>
      <TextInput
        style={[s.input, s.multilineInput]}
        placeholder="Please describe your problem in detail..."
        placeholderTextColor="#999"
        value={description}
        onChangeText={setDescription}
        multiline={true}
        numberOfLines={5}
        textAlignVertical="top"
      />

      <Text style={s.fieldLabel}>Supporting Media (Optional)</Text>
      
      {attachments.length > 0 && (
        <View style={s.attachmentList}>
          {attachments.map((file, idx) => (
            <View key={idx} style={s.attachmentItem}>
              <Feather name="file" size={16} color={COLORS.greenMid} style={{ marginRight: 8 }} />
              <Text style={s.attachmentName} numberOfLines={1}>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </Text>
              <TouchableOpacity onPress={() => handleRemoveAttachment(idx)} style={s.removeAttachmentBtn}>
                <Feather name="x" size={16} color={COLORS.errorRed} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {attachments.length < 3 ? (
        <TouchableOpacity style={s.attachBtn} onPress={handlePickDocument} activeOpacity={0.8}>
          <Feather name="paperclip" size={16} color={COLORS.greenDeep} style={{ marginRight: 8 }} />
          <Text style={s.attachBtnText}>Attach File (Max 3)</Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.limitText}>Maximum 3 attachments allowed.</Text>
      )}

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={s.submitBtnText}>Submit Support Ticket</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
