import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image, StatusBar, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../core/network/supabase';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import localStyles from '../styles/otpStyles';
import { useTranslation } from 'react-i18next';

// Prototype Colors
const PROTO = {
  primary:          '#1E5C2E',
  background:       '#F5F3EE',   // --background: warm beige
  foreground:       '#1A2E1A',   // --foreground: title text
  card:             '#ffffff',   // --card: input bg
  mutedFg:          '#6B7B6B',   // --muted-foreground: subtitles, labels
  border:           'rgba(30, 92, 46, 0.12)', // --border
  secondary:        '#EAF2EB',   // --secondary bg for buttons
};

export default function OTPScreen({ phone, onBack, onVerifySuccess }) {
    const { t } = useTranslation();
    const cleanPhone = phone.replace(/^(\+?91\s*)+/, '').trim();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    const inputs = useRef([]);

    const handleOtpChange = (value, index) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handleVerify = async () => {
        const otpCode = otp.join('');
        if (otpCode.length < 6) {
            Alert.alert('Error', t('otp.invalid_otp_alert'));
            return;
        }

        setLoading(true);


        try {
            const { BACKEND_URL } = require('../../../core/network/config');
            const response = await fetch(`${BACKEND_URL}/api/farmers/register/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: cleanPhone, otp: otpCode }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                // Secondary fallback: Try Supabase verifyOtp
                const { error: supabaseErr } = await supabase.auth.verifyOtp({
                    phone: '+91' + cleanPhone,
                    token: otpCode,
                    type: 'sms',
                });
                if (supabaseErr) {
                    throw new Error(data.error || supabaseErr.message || 'Invalid OTP');
                }
            }

            // Visual verified success state
            setVerified(true);
            setLoading(false);

            setTimeout(async () => {
                if (onVerifySuccess) {
                    await onVerifySuccess(cleanPhone);
                }
            }, 800);
        } catch (error) {
            Alert.alert(t('otp.verification_failed'), error.message || 'Invalid OTP');
            setLoading(false);
        }
    };

    const isComplete = otp.every(digit => digit !== '');

    return (
        <KeyboardAvoidingView
            style={localStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#F5F3EE" />
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36 }}>
                {/* Header brand section from App.tsx */}
                <View style={localStyles.headerTop}>
                    <TouchableOpacity style={localStyles.backButton} onPress={onBack} activeOpacity={0.7}>
                        <Feather name="arrow-left" size={16} color={PROTO.foreground} />
                    </TouchableOpacity>
                    <View style={localStyles.headerBrand}>
                        <AnnsetuLogo size={38} backgroundColor={PROTO.primary} iconColor="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={localStyles.headerBrandText}>Annsetu</Text>
                    </View>
                    <View style={{ width: 32 }} />
                </View>

                {/* Header text from App.tsx */}
                <View style={{ marginTop: 24, marginBottom: 32 }}>
                    <Text style={localStyles.headerTitle}>{t('otp.verification_code_title')}</Text>
                    <Text style={localStyles.headerSubtitle}>
                        {t('otp.otp_sent_to')} <Text style={{ color: PROTO.foreground, fontWeight: '500' }}>{cleanPhone}</Text>
                    </Text>
                </View>

                {/* OTP input container */}
                <View style={localStyles.otpRow}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={ref => inputs.current[index] = ref}
                            style={[
                                localStyles.otpInput,
                                digit ? localStyles.otpInputActive : localStyles.otpInputInactive
                            ]}
                            maxLength={1}
                            keyboardType="numeric"
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                        />
                    ))}
                </View>

                {/* Action button */}
                <TouchableOpacity
                    style={[
                        localStyles.primaryButton,
                        verified ? localStyles.buttonVerified : (isComplete ? localStyles.buttonActive : localStyles.buttonDisabled)
                    ]}
                    onPress={handleVerify}
                    disabled={!isComplete || loading || verified}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : verified ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="check" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={localStyles.primaryButtonText}>{t('otp.verified')}</Text>
                        </View>
                    ) : (
                        <Text style={localStyles.primaryButtonText}>{t('otp.verify_continue_btn')}</Text>
                    )}
                </TouchableOpacity>

                {/* Resend OTP row */}
                <View style={localStyles.resendContainer}>
                    <TouchableOpacity onPress={() => {/* Resend logic */ }}>
                        <Text style={localStyles.resendLink}>{t('otp.resend_code')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}