import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import OtpScreen from './screens/OtpScreen';
import { useAuthStore } from './store/useAuthStore';

const Stack = createStackNavigator();

export default function AuthNavigator({ onLoginSuccess }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login">
        {({ navigation }) => {
          const { loginSuccess } = useAuthStore();
          const handleSuccess = onLoginSuccess || ((phone, role, token) => loginSuccess(phone, role, token));
          return (
            <LoginScreen
              onLoginSuccess={handleSuccess}
              onNavigateToRegister={() => navigation.navigate('Register')}
              onNavigateToOtp={(phone) => navigation.navigate('Otp', { phone })}
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onNavigateToLogin={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Otp">
        {({ navigation, route }) => {
          const { loginSuccess } = useAuthStore();
          const phone = route.params?.phone || '';
          return (
            <OtpScreen
              phone={phone}
              onVerifySuccess={() => loginSuccess(phone)}
              onNavigateBack={() => navigation.navigate('Login')}
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
