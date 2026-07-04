import React, { useEffect, useState } from 'react';
import { Alert, View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Platform, Keyboard } from 'react-native';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/features/farmer/screens/HomeScreen';
import LoginScreen from './src/features/auth/screens/LoginScreen';
import VendorScreen from './src/features/vendor/screens/VendorScreen';
import { supabase } from './src/core/network/supabase';
import ColdStorageScreen from './src/features/cold-storage/screens/ColdStorageScreen';
import { Feather } from '@expo/vector-icons';

// Configure push notification alert settings when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Expo Google Fonts loader
import { useFonts } from 'expo-font';
import { NotoSans_400Regular, NotoSans_700Bold } from '@expo-google-fonts/noto-sans';
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';

// Inject Google Fonts dynamic stylesheet if running on Web
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.type = 'text/css';
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    
    body, div, span, text, input, button, textarea {
      font-family: 'Noto Sans', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
  `;
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  document.head.appendChild(style);
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [role, setRole] = useState('Farmer'); // 'Farmer', 'Vendor', 'ColdStorage'
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [hidePreviewFromLogin, setHidePreviewFromLogin] = useState(false);

  // Load custom fonts for native Android / iOS builds (APK/IPA)
  const [fontsLoaded] = useFonts({
    'NotoSans-Regular': NotoSans_400Regular,
    'NotoSans-Bold': NotoSans_700Bold,
    'NotoSansDevanagari-Regular': NotoSansDevanagari_400Regular,
    'NotoSansDevanagari-Bold': NotoSansDevanagari_700Bold,
    'DMMono-Regular': DMMono_400Regular,
  });

  const determineRole = async (phone) => {
    if (!phone) return;
    try {
      const { fetchUserRole } = require('./src/core/network/api');
      const detectedRole = await fetchUserRole(phone);
      setRole(detectedRole);
    } catch (e) {
      console.warn('Error determining role:', e);
      setRole('ColdStorage');
    }
  };

  useEffect(() => {
    if (session && session.user && session.user.phone) {
      if (role === 'Farmer') {
        determineRole(session.user.phone);
      }
    } else {
      setRole('Farmer');
    }
  }, [session, role]);

  useEffect(() => {
    if (session && session.user && session.user.phone) {
      // Import dynamically to avoid loading issues at bundle initialization
      const { registerForPushNotificationsAsync } = require('./src/core/network/pushService');
      registerForPushNotificationsAsync(session.user.phone).catch(err => {
        console.warn('Failed to register push token:', err.message);
      });
    }
  }, [session]);

  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    }).catch(err => {
      console.warn("Failed to get initial session:", err);
      setLoadingSession(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. OTA Updates check
    async function checkUpdates() {
      if (__DEV__) return; 
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            "Update Available",
            "A new update has been downloaded. The app will now reload to apply the changes.",
            [{ text: "Reload Now", onPress: () => Updates.reloadAsync() }]
          );
        }
      } catch (e) {
        console.log("Error checking for updates:", e);
      }
    }
    checkUpdates();

    // 4. Keyboard listeners to hide preview bar when typing
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  if (!fontsLoaded || loadingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const handleLoginSuccess = (phone, registrationRole) => {
    setSession({
      user: {
        phone: '+91' + phone,
      }
    });
    
    if (registrationRole === 'coldstorage') {
      setRole('ColdStorageFacility');
    } else if (registrationRole === 'vendor') {
      setRole('Vendor');
    } else if (registrationRole === 'farmer') {
      setRole('ColdStorage');
    } else {
      // Normal login without explicit registration role
      determineRole('+91' + phone);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setSession(null);
    setRole('Farmer');
    setShowRoleSwitcher(false);
  };

  const renderScreen = () => {
    switch (role) {
      case 'Farmer':
        return (
          <LoginScreen 
            onLoginSuccess={handleLoginSuccess} 
            onHidePreviewChange={setHidePreviewFromLogin}
          />
        );
      case 'Vendor':
        return (
          <VendorScreen 
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={handleLogout}
          />
        );
      case 'ColdStorage':
        return (
          <HomeScreen 
            loggedInPhone={session?.user?.phone} 
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={handleLogout}
          />
        );
      case 'ColdStorageFacility':
        return (
          <ColdStorageScreen 
            loggedInPhone={session?.user?.phone}
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={handleLogout}
          />
        );
      default:
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}

      {/* Persistent Floating UI Preview Navigation Bar */}
      {((role !== 'Vendor' && role !== 'ColdStorage' && role !== 'ColdStorageFacility') || showRoleSwitcher) && !isKeyboardVisible && !hidePreviewFromLogin && (role !== 'Farmer' || session !== null) && (
        <View style={barStyles.previewBar}>
          <Text style={barStyles.previewLabel}>
            📱 Preview: <Text style={{ fontWeight: 'bold' }}>{role === 'ColdStorage' ? 'Farmer' : role === 'Farmer' ? 'Login' : role === 'ColdStorageFacility' ? 'Cold Storage' : role}</Text>
          </Text>
          <Text style={barStyles.separator}>·</Text>
          <View style={barStyles.linkGroup}>
            <TouchableOpacity onPress={() => { setRole('Farmer'); setShowRoleSwitcher(false); }} activeOpacity={0.8}>
              <Text style={[barStyles.linkLabel, role === 'Farmer' && barStyles.linkLabelActive]}>Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => { setRole('ColdStorage'); setShowRoleSwitcher(false); }} activeOpacity={0.8}>
              <Text style={[barStyles.linkLabel, role === 'ColdStorage' && barStyles.linkLabelActive]}>Farmer</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setRole('Vendor'); setShowRoleSwitcher(false); }} activeOpacity={0.8}>
              <Text style={[barStyles.linkLabel, role === 'Vendor' && barStyles.linkLabelActive]}>Vendor</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setRole('ColdStorageFacility'); setShowRoleSwitcher(false); }} activeOpacity={0.8}>
              <Text style={[barStyles.linkLabel, role === 'ColdStorageFacility' && barStyles.linkLabelActive]}>Cold Storage</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const barStyles = StyleSheet.create({
  previewBar: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#2E3D34',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#415549',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  previewLabel: {
    fontSize: 10,
    color: '#D8E2DC',
    fontWeight: '500',
  },
  separator: {
    color: '#D8E2DC',
    fontSize: 10,
    marginHorizontal: 6,
  },
  linkGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkLabel: {
    fontSize: 10,
    color: '#9CA8A0',
    fontWeight: '600',
    marginHorizontal: 6,
  },
  linkLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
