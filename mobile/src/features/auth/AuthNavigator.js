import React, { useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import OtpScreen from './screens/OtpScreen';

/**
 * Local auth screen transitions orchestrator
 */
export default function AuthNavigator({ onLoginSuccess }) {
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'register' | 'otp'
  const [phoneForOtp, setPhoneForOtp] = useState('');

  const navigateTo = (screen, params = {}) => {
    if (params.phone) {
      setPhoneForOtp(params.phone);
    }
    setCurrentScreen(screen);
  };

  switch (currentScreen) {
    case 'register':
      return <RegisterScreen onNavigateToLogin={() => navigateTo('login')} />;
    case 'otp':
      return (
        <OtpScreen 
          phone={phoneForOtp} 
          onVerifySuccess={() => onLoginSuccess(phoneForOtp)}
          onNavigateBack={() => navigateTo('login')} 
        />
      );
    case 'login':
    default:
      return (
        <LoginScreen 
          onNavigateToRegister={() => navigateTo('register')}
          onNavigateToOtp={(phone) => navigateTo('otp', { phone })}
          onLoginSuccess={onLoginSuccess}
        />
      );
  }
}
