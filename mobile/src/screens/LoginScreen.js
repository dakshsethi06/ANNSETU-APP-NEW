import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator, Image, ScrollView, StatusBar, KeyboardAvoidingView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import styles from './styles/authStyles';
import { COLORS } from '../theme';
import RegisterScreen from './RegisterScreen';
import OTPScreen from './OtpScreen';

export default function LoginScreen({ onLoginSuccess, onHidePreviewChange }) {
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'register' | 'otp'
  const [loginMode, setLoginMode] = useState('farmer'); // 'farmer' | 'coldstorage'
  const [phone, setPhone] = useState('');
  const [mpin, setMpin] = useState('');
  const [lang, setLang] = useState('en');
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
      const { BACKEND_URL } = require('../services/config');
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
      const { BACKEND_URL } = require('../services/config');
      const url = `${BACKEND_URL}/api/farmers/login-mpin`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mpin }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid MPIN or phone number.');
      }

      if (onLoginSuccess) {
        onLoginSuccess(phone, 'farmer');
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
        const { fetchUserRole } = require('../services/api');
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
          const { addColdStorage } = require('../services/storageService');
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
          const { addFarmer } = require('../services/api');
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
    return <RegisterScreen onBack={() => setCurrentScreen('login')} onNext={handleRegisterOTP} />;
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
              source={require('../../assets/ann_setu_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>Annsetu</Text>
          <Text style={styles.brandSubtitle}>
            {loginMode === 'farmer'
              ? (lang === 'en' ? 'Cold Storage Management Platform' : 'कोल्ड स्टोरेज प्रबंधन मंच')
              : (lang === 'en' ? 'Partner Access Portal' : 'साझेदार पहुंच पोर्टल')}
          </Text>

          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langButton, lang === 'en' && styles.langButtonActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langButton, lang === 'hi' && styles.langButtonActive]}
              onPress={() => setLang('hi')}
            >
              <Text style={[styles.langText, lang === 'hi' && styles.langTextActive]}>हिंदी</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.title}>
            {loginMode === 'farmer'
              ? (lang === 'en' ? 'Welcome Back' : 'स्वागत है')
              : (lang === 'en' ? 'Cold Storage Login' : 'कोल्ड स्टोरेज लॉगिन')}
          </Text>
          <Text style={styles.subtitle}>
            {loginMode === 'farmer'
              ? (lang === 'en' ? 'Enter your mobile number to continue' : 'जारी रखने के लिए मोबाइल नंबर दर्ज करें')
              : (lang === 'en' ? 'Enter your registered number to receive OTP' : 'OTP प्राप्त करने के लिए पंजीकृत मोबाइल नंबर दर्ज करें')}
          </Text>

          <Text style={styles.label}>{lang === 'en' ? 'Mobile Number' : 'मोबाइल नंबर'}</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>+91</Text>
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              placeholder={lang === 'en' ? '10-digit mobile number' : '10 अंकों का मोबाइल नंबर'}
              placeholderTextColor="#6B7B6B"
              keyboardType="numeric"
              maxLength={10}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
            />
          </View>

          {loginMode === 'farmer' && (
            <>
              <Text style={styles.label}>{lang === 'en' ? 'Enter MPIN' : 'एमपीआईएन दर्ज करें'}</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder={lang === 'en' ? 'Enter 4-digit MPIN' : '4 अंकों का एमपीआईएन दर्ज करें'}
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
                  {lang === 'en' ? 'Forgot MPIN? Click Here' : 'एमपीआईएन भूल गए? रीसेट करें'}
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
                  ? (lang === 'en' ? 'Get OTP' : 'OTP प्राप्त करें')
                  : (lang === 'en' ? 'Login' : 'लॉगिन करें')}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.secureNote}>
            <Feather name="shield" size={14} color="#6B7B6B" />
            <Text style={styles.secureNoteText}>
              {loginMode === 'farmer'
                ? (lang === 'en' ? 'Secured with verification & data encryption' : 'OTP और डेटा एन्क्रिप्शन से सुरक्षित')
                : (lang === 'en' ? 'Cold Storage Authorized Sign-In' : 'कोल्ड स्टोरेज अधिकृत साइन-इन')}
            </Text>
          </View>

          {loginMode === 'farmer' ? (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.createAccountContainer}>
                <Text style={styles.createAccountText}>{lang === 'en' ? 'New to Annsetu?' : 'Annsetu पर नए हैं?'}</Text>
                <TouchableOpacity onPress={() => setCurrentScreen('register')}>
                  <Text style={styles.createAccountLink}>{lang === 'en' ? 'Create Account' : 'खाता बनाएं'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{ marginTop: 24, alignItems: 'center' }}
                onPress={() => { setLoginMode('coldstorage'); setMpin(''); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#1E5C2E', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>
                  {lang === 'en' ? 'Cold Storage? Click here' : 'कोल्ड स्टोरेज पार्टनर? यहाँ क्लिक करें'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={{ marginTop: 12, alignItems: 'center' }}
              onPress={() => { setLoginMode('farmer'); setMpin(''); }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#1E5C2E', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>
                {lang === 'en' ? 'Back to Farmer Login' : 'किसान लॉगिन पर वापस जाएं'}
              </Text>
            </TouchableOpacity>
          )}
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
                {lang === 'en' ? 'Reset Security MPIN' : 'सुरक्षा एमपीआईएन रीसेट करें'}
              </Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Feather name="x" size={22} color="#1E5C2E" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8 }}>
              {lang === 'en' ? 'Mobile Number' : 'मोबाइल नंबर'}
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
              {lang === 'en' ? 'Verification OTP' : 'सत्यापन ओटीपी'}
            </Text>
            <View style={[styles.inputContainer, { marginBottom: 16 }]}>
              <Feather name="shield" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={lang === 'en' ? 'Enter 1234 to verify' : 'सत्यापित करने के लिए 1234 दर्ज करें'}
                keyboardType="numeric"
                maxLength={4}
                value={resetOtp}
                onChangeText={setResetOtp}
              />
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7B6B', textTransform: 'uppercase', marginBottom: 8 }}>
              {lang === 'en' ? 'New 4-Digit MPIN' : 'नया 4 अंकों का एमपीआईएन'}
            </Text>
            <View style={[styles.inputContainer, { marginBottom: 24 }]}>
              <Feather name="lock" size={16} color="#6B7B6B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={lang === 'en' ? 'Enter new 4-digit MPIN' : 'नया 4 अंकों का एमपीआईएन दर्ज करें'}
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
                  {lang === 'en' ? 'Reset MPIN' : 'एमपीआईएन रीसेट करें'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}