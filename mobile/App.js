import React, { useEffect, useState } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import { supabase } from './src/services/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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

  if (loadingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  // Conditionally render based on authentication status
  if (!session) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  return <HomeScreen />;
}
