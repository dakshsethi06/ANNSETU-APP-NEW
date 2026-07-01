import React, { useEffect, useState } from 'react';
import { Alert, View, ActivityIndicator, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import { supabase } from './src/services/supabase';

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

  // Load custom fonts for native Android / iOS builds (APK/IPA)
  const [fontsLoaded] = useFonts({
    'NotoSans-Regular': NotoSans_400Regular,
    'NotoSans-Bold': NotoSans_700Bold,
    'NotoSansDevanagari-Regular': NotoSansDevanagari_400Regular,
    'NotoSansDevanagari-Bold': NotoSansDevanagari_700Bold,
    'DMMono-Regular': DMMono_400Regular,
  });


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

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  if (!fontsLoaded || loadingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }


  const handleLoginSuccess = (phone) => {
    setSession({
      user: {
        phone: '+91' + phone,
      }
    });
  };

  // Conditionally render based on authentication status
  if (!session) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <HomeScreen loggedInPhone={session?.user?.phone} />;
}
