import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator, Image, ScrollView, StatusBar, KeyboardAvoidingView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../core/network/supabase';
import styles from '../styles/authStyles';
import { COLORS } from '../../../core/theme/theme';
import RegisterScreen from './RegisterScreen';
import OTPScreen from './OtpScreen';
import { useTranslation } from 'react-i18next';

export default function LoginScreen({ onLoginSuccess, onHidePreviewChange }) {
  const { t, i18n } = useTranslation();
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'register' | 'otp'
  const [loginMode, setLoginMode] = useState('farmer'); // 'farmer' | 'coldstorage'
  const [phone, setPhone] = useState('');
  const [mpin, setMpin] = useState('');

  const [loading, setLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  // Reset MPIN States
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewMpin, setResetNewMpin] = useState('');
  const [resettingMpin, setResettingMpin] = useState(false);

  useEffect(() => {
    if (onHidePreviewChange) {
      onHidePreviewChange(currentScreen === 'register' || currentScreen === 'otp');
    }
  }, [currentScreen, onHidePreviewChange]);

  const handleResetMpinSubmit = async () => {
    if (resetPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (resetOtp !== '1234') {
      Alert.alert('Error', 'Invalid verification OTP. Please use "1234" to verify.');
      return;
    }
    if (resetNewMpin.length < 4) {
      Alert.alert('Error', 'New MPIN must be exactly 4 digits.');
      return;
    }

    setResettingMpin(true);
    try {
      const { BACKEND_URL } = require('../../../core/network/config');
      const response = await fetch(`${BACKEND_URL}/api/farmers/reset-mpin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone, otp: resetOtp, newMpin: resetNewMpin }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset MPIN.');
      }
      Alert.alert('Success', 'MPIN reset successfully! You can now log in.');
      setResetModalVisible(false);
      setMpin('');
    } catch (err) {
      Alert.alert('Reset Failed', err.message);
    } finally {
      setResettingMpin(false);
    }
  };

  const handleMpinLogin = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (mpin.length < 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit MPIN.');
      return;
    }

    setLoading(true);
    try {
      const { BACKEND_URL } = require('../../../core/network/config');
      const url = `${BACKEND_URL}/api/farmers/login-mpin`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mpin, role: loginMode }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid MPIN or phone number.');
      }

      if (onLoginSuccess) {
        onLoginSuccess(phone, data.role, data.token);
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      if (loginMode === 'coldstorage') {
        const { fetchUserRole } = require('../../farmer/services/farmerService');
        const detected = await fetchUserRole('+91' + phone);
        if (detected !== 'ColdStorageFacility') {
          Alert.alert('Access Denied', 'This phone number is not registered as a Cold Storage Partner.');
          setLoading(false);
          return;
        }
      }

      // Attempt real Supabase signInWithOtp
      const { error } = await supabase.auth.signInWithOtp({
        phone: '+91' + phone,
      });
      if (error) throw error;
      setCurrentScreen('otp');
    } catch (error) {
      // Mock Fallback: Proceed to OTP screen anyway
      console.log('Supabase signInWithOtp bypassed (mocked OTP):', error.message);
      setCurrentScreen('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOTP = async (mobileNumber, formData) => {
    setPhone(mobileNumber);
    setRegistrationData(formData);
    setLoading(true);
    try {
      // Attempt real Supabase signInWithOtp
      const { error } = await supabase.auth.signInWithOtp({
        phone: '+91' + mobileNumber,
      });
      if (error) throw error;
      setCurrentScreen('otp');
    } catch (error) {
      // Mock Fallback: Proceed to OTP screen anyway
      console.log('Supabase signInWithOtp bypassed for registration (mocked OTP):', error.message);
      setCurrentScreen('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuccess = async (verifiedPhone) => {
    if (registrationData) {
      setLoading(true);
      try {
        if (registrationData.role === 'coldstorage') {
          const { addColdStorage } = require('../../cold-storage/services/storageService');
          await addColdStorage({
            id: registrationData.phone,
            displayName: registrationData.storageName || registrationData.name,
            city: registrationData.village || 'Tundla',
            district: registrationData.district || 'Firozabad',
            state: registrationData.state || 'Uttar Pradesh',
            address: `${registrationData.village || 'Tundla'}, ${registrationData.district || 'Firozabad'}`,
            contactPerson: registrationData.name,
            phone: registrationData.phone,
          });
          Alert.alert('Success', `Cold Storage "${registrationData.storageName || registrationData.name}" registered successfully!`);
        } else {
          const { addFarmer } = require('../../farmer/services/farmerService');
          // Register the farmer in the real Postgres database
          await addFarmer({
            serial_number: registrationData.phone,
            name: registrationData.name,
            state: registrationData.state || 'Uttar Pradesh',
            commodity: 'Potato',
            phone: registrationData.phone,
            fatherName: registrationData.fatherName || 'Father Name',
            village: registrationData.village || '',
            district: registrationData.district || '',
            tehsil: registrationData.district || '',
            mpin: registrationData.mpin,
          });
          Alert.alert('Success', `Farmer "${registrationData.name}" registered successfully!`);
        }
      } catch (err) {
        console.warn('Backend database registration failed, but proceeding to dashboard:', err.message);
      } finally {
        setLoading(false);
      }
    }

    if (onLoginSuccess) {
      onLoginSuccess(
        verifiedPhone,
        registrationData?.role || (loginMode === 'coldstorage' ? 'ColdStorageFacility' : undefined)
      );
    }
  };

  if (currentScreen === 'register') {
    return <RegisterScreen onBack={() => setCurrentScreen('login')} onNext={handleRegisterOTP} lang={i18n.language} setLang={(l) => i18n.changeLanguage(l)} />;
  }

  if (currentScreen === 'otp') {
    return <OTPScreen phone={phone} onBack={() => setCurrentScreen('login')} onVerifySuccess={handleVerifySuccess} />;
  }

  // Login Screen ("Welcome Back")
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E5C2E" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../../assets/ann_setu_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>Annsetu</Text>
          <Text style={styles.brandSubtitle}>
            {loginMode === 'farmer'
              ? t('auth.platform_subtitle')
              : t('auth.partner_subtitle')}
          </Text>

          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langButton, i18n.language === 'en' && styles.langButtonActive]}
              onPress={() => i18n.changeLanguage('en')}
            >
              <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langButton, i18n.language === 'hi' && styles.langButtonActive]}
              onPress={() => i18n.changeLanguage('hi')}
            >
              <Text style={[styles.langText, i18n.language === 'hi' && styles.langTextActive]}>हिंदी</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.title}>
            {loginMode === 'farmer'
              ? t('auth.welcome_back')
              : t('auth.cold_storage_login')}
          </Text>
          <Text style={styles.subtitle}>
            {loginMode === 'farmer'
              ? t('auth.enter_mobile')
              : t('auth.enter_registered')}
          </Text>

          <Text style={styles.label}>{t('auth.mobile_number')}</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>+91</Text>
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.mobile_placeholder')}
              placeholderTextColor="#6B7B6B"
              keyboardType="numeric"
              maxLength={10}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
            />
          </View>

          {loginMode === 'farmer' && (
            <>
              <Text style={styles.label}>{t('auth.enter_mpin')}</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.mpin_placeholder')}
                  placeholderTextColor="#6B7B6B"
                  keyboardType="numeric"
                  maxLength={4}
                  value={mpin}
                  onChangeText={(text) => setMpin(text.replace(/[^0-9]/g, ''))}
                />
              </View>
              <TouchableOpacity
                style={{ alignItems: 'center', marginTop: 8, marginBottom: 20 }}
                onPress={() => {
                  setResetPhone(phone);
                  setResetOtp('');
                  setResetNewMpin('');
                  setResetModalVisible(true);
                }}
              >
                <Text style={{ color: '#1E5C2E', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                  {t('auth.forgot_mpin')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, phone.length === 10 ? styles.primaryButtonActive : styles.primaryButtonDisabled]}
            onPress={loginMode === 'farmer' ? handleMpinLogin : handleGetOTP}
            disabled={phone.length < 10 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {loginMode === 'coldstorage'
                  ? t('auth.get_otp')
                  : t('auth.login_btn')}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.secureNote}>
            <Feather name="shield" size={14} color="#6B7B6B" />
            <Text style={styles.secureNoteText}>
              {loginMode === 'farmer'
                ? t('auth.secure_note')
                : t('auth.cs_secure_note')}
            </Text>
          </View>

            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.createAccountContainer}>
                <Text style={styles.createAccountText}>{t('auth.new_to_annsetu')}</Text>
                <TouchableOpacity onPress={() => setCurrentScreen('register')}>
                  <Text style={styles.createAccountLink}>{t('auth.create_account')}</Text>
                </TouchableOpacity>
              </View>
            </>
        </View>
      </ScrollView>

      <Modal
        visible={resetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FAF7F0', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E8E0CE' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E5C2E' }}>
                {t('auth.reset_mpin_title')}
              </Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Feather name="x" size={22} color="#1E5C2E" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('auth.mobile_number')}
            </Text>
            <View style={[styles.inputContainer, { marginBottom: 16 }]}>
              <Text style={styles.inputPrefix}>+91</Text>
              <View style={styles.inputDivider} />
              <TextInput
                style={styles.input}
                placeholder="10-digit phone number"
                keyboardType="numeric"
                maxLength={10}
                value={resetPhone}
                onChangeText={setResetPhone}
              />
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('auth.verification_otp')}
            </Text>
            <View style={[styles.inputContainer, { marginBottom: 16 }]}>
              <Feather name="shield" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.otp_verify_placeholder')}
                keyboardType="numeric"
                maxLength={4}
                value={resetOtp}
                onChangeText={setResetOtp}
              />
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('auth.new_mpin_label')}
            </Text>
            <View style={[styles.inputContainer, { marginBottom: 24 }]}>
              <Feather name="lock" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.new_mpin_placeholder')}
                keyboardType="numeric"
                maxLength={4}
                value={resetNewMpin}
                onChangeText={(text) => setResetNewMpin(text.replace(/[^0-9]/g, ''))}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#1E5C2E' }]}
              onPress={handleResetMpinSubmit}
              disabled={resettingMpin}
            >
              {resettingMpin ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t('auth.reset_mpin_btn')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}