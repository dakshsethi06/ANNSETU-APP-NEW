import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

import LoginScreen from '../features/auth/screens/LoginScreen';
import VendorScreen from '../features/vendor/screens/VendorScreen';
import HomeScreen from '../features/farmer/screens/HomeScreen';
import ColdStorageScreen from '../features/cold-storage/screens/ColdStorageScreen';

export default function AppNavigator({
  role,
  setRole,
  session,
  onLoginSuccess,
  setHidePreviewFromLogin,
  setShowRoleSwitcher,
  showRoleSwitcher,
  isKeyboardVisible,
  hidePreviewFromLogin,
  onLogout
}) {
  const renderScreen = () => {
    switch (role) {
      case 'Farmer':
        return (
          <LoginScreen 
            onLoginSuccess={onLoginSuccess} 
            onHidePreviewChange={setHidePreviewFromLogin}
          />
        );
      case 'Vendor':
        return (
          <VendorScreen 
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={onLogout}
          />
        );
      case 'ColdStorage':
        return (
          <HomeScreen 
            loggedInPhone={session?.user?.phone} 
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={onLogout}
          />
        );
      case 'ColdStorageFacility':
        return (
          <ColdStorageScreen 
            loggedInPhone={session?.user?.phone}
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={onLogout}
          />
        );
      default:
        return <LoginScreen onLoginSuccess={onLoginSuccess} />;
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
