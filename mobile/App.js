import React, { useEffect } from 'react';
import { Alert, View, ActivityIndicator, Platform, Keyboard } from 'react-native';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import { supabase } from './src/core/network/supabase';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/features/auth/store/useAuthStore';
import { NavigationContainer } from '@react-navigation/native';

// Global fetch interceptor to automatically attach JWT token
const originalFetch = global.fetch;
global.fetch = async (input, init) => {
  try {
    const sessionObj = useAuthStore.getState().session;
    if (sessionObj && sessionObj.access_token) {
      init = init || {};
      init.headers = init.headers || {};
      if (!init.headers['Authorization'] && !init.headers['authorization']) {
        init.headers['Authorization'] = `Bearer ${sessionObj.access_token}`;
      }
    }
  } catch (err) {
    console.warn('Fetch interceptor failed to attach auth token:', err.message);
  }
  return originalFetch(input, init);
};


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
  const {
    session,
    setSession,
    role,
    setRole,
    loadingSession,
    setLoadingSession,
    setKeyboardVisible,
    determineRole,
  } = useAuthStore();

  // Load custom fonts for native Android / iOS builds (APK/IPA)
  const [fontsLoaded] = useFonts({
    'NotoSans-Regular': NotoSans_400Regular,
    'NotoSans-Bold': NotoSans_700Bold,
    'NotoSansDevanagari-Regular': NotoSansDevanagari_400Regular,
    'NotoSansDevanagari-Bold': NotoSansDevanagari_700Bold,
    'DMMono-Regular': DMMono_400Regular,
  });

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
    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        setLoadingSession(false);
      }
    };

    // 2.5-second timeout safety fallback
    const timeoutId = setTimeout(() => {
      console.warn("Initial session retrieval timed out. Proceeding to load app...");
      done();
    }, 2500);

    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      if (session) {
        setSession(session);
      } else {
        const current = useAuthStore.getState().session;
        if (!current || !current.isMpinLogin) {
          setSession(null);
        }
      }
      done();
    }).catch(err => {
      clearTimeout(timeoutId);
      console.warn("Failed to get initial session:", err);
      done();
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      } else {
        const current = useAuthStore.getState().session;
        if (!current || !current.isMpinLogin) {
          setSession(null);
        }
      }
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
        <Text style={{ marginTop: 10, color: '#2E7D32', fontWeight: 'bold' }}>
          {!fontsLoaded ? "Loading Fonts..." : "Loading Session..."}
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
