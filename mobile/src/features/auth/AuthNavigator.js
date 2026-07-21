import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import OtpScreen from './screens/OtpScreen';
import { useAuthStore } from './store/useAuthStore';

const Stack = createStackNavigator();

export default function AuthNavigator({ onLoginSuccess }) {
  const { loginSuccess, setHidePreviewFromLogin } = useAuthStore();
  const handleSuccess = onLoginSuccess || ((phone, role, token) => loginSuccess(phone, role, token));

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLoginSuccess={handleSuccess}
            onHidePreviewChange={setHidePreviewFromLogin}
            onNavigateToRegister={() => navigation.navigate('Register')}
            onNavigateToOtp={(phone) => navigation.navigate('Otp', { phone })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onBack={() => navigation.navigate('Login')}
            onNext={async (phone, formData) => {
              try {
                const { BACKEND_URL } = require('../../core/network/config');
                await fetch(`${BACKEND_URL}/api/farmers/register/send-otp`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone, email: formData?.email }),
                });
              } catch (err) {
                console.warn('[Register onNext] send-otp error:', err.message);
              }
              navigation.navigate('Otp', { phone, registrationData: formData });
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Otp">
        {({ navigation, route }) => {
          const phone = route.params?.phone || '';
          return (
            <OtpScreen
              phone={phone}
              onVerifySuccess={() => loginSuccess(phone)}
              onBack={() => navigation.navigate('Login')}
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
