import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../features/auth/store/useAuthStore';

import AuthNavigator from '../features/auth/AuthNavigator';
import FarmerNavigator from '../features/farmer/FarmerNavigator';
import VendorScreen from '../features/vendor/screens/VendorScreen';
import ColdStorageScreen from '../features/cold-storage/screens/ColdStorageScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const {
    role,
    setRole,
    session,
    loginSuccess,
    setHidePreviewFromLogin,
    setShowRoleSwitcher,
    showRoleSwitcher,
    isKeyboardVisible,
    hidePreviewFromLogin,
    logout,
  } = useAuthStore();

  const renderNavigator = () => {
    if (role === 'Farmer' || role === 'unauthenticated' || !session) {
      return <AuthNavigator />;
    }
    
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {role === 'Vendor' ? (
          <Stack.Screen name="Vendor">
            {() => (
              <VendorScreen 
                loggedInPhone={session?.user?.phone}
                onSwitchRole={() => setShowRoleSwitcher(true)}
                onLogout={logout}
              />
            )}
          </Stack.Screen>
        ) : role === 'ColdStorage' ? (
          <Stack.Screen name="Farmer">
            {() => (
              <FarmerNavigator 
                loggedInPhone={session?.user?.phone} 
                onSwitchRole={() => setShowRoleSwitcher(true)}
                onLogout={logout}
              />
            )}
          </Stack.Screen>
        ) : role === 'ColdStorageFacility' ? (
          <Stack.Screen name="ColdStorageFacility">
            {() => (
              <ColdStorageScreen 
                loggedInPhone={session?.user?.phone}
                onSwitchRole={() => setShowRoleSwitcher(true)}
                onLogout={logout}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {renderNavigator()}

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
