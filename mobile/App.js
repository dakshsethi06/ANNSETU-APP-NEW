import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  useEffect(() => {
    async function checkUpdates() {
      if (__DEV__) return; // skip checking in local development / Expo Go
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
  }, []);

  return <HomeScreen />;
}

