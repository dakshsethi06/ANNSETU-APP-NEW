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
<<<<<<< Updated upstream
        {({ navigation }) => {
          const handleSuccess = onLoginSuccess || ((phone, role, token) => loginSuccess(phone, role, token));
          return (
            <LoginScreen
              onLoginSuccess={handleSuccess}
              onHidePreviewChange={setHidePreviewFromLogin}
              onNavigateToRegister={() => navigation.navigate('Register')}
              onNavigateToOtp={(phone) => navigation.navigate('Otp', { phone })}
            />
          );
        }}
=======
        {({ navigation }) => (
          <LoginScreen
            onLoginSuccess={handleSuccess}
            onHidePreviewChange={setHidePreviewFromLogin}
            onNavigateToRegister={() => navigation.navigate('Register')}
            onNavigateToOtp={(phone) => navigation.navigate('Otp', { phone })}
          />
        )}
>>>>>>> Stashed changes
      </Stack.Screen>
      <Stack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onBack={() => navigation.navigate('Login')}
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
