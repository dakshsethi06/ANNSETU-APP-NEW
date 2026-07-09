import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../features/auth/store/useAuthStore';

// Composing modular navigators, never feature screens directly!
import AuthNavigator from '../features/auth/AuthNavigator';
import FarmerNavigator from '../features/farmer/FarmerNavigator';

// Legacy screens for Vendor and ColdStorageFacility to maintain compilation compatibility
import VendorScreen from '../features/vendor/screens/VendorScreen';
import ColdStorageScreen from '../features/cold-storage/screens/ColdStorageScreen';

/**
 * Root navigator composing modular stacks and managing preview configurations.
 */
export default function RootNavigator({
  showRoleSwitcher,
  setShowRoleSwitcher,
  isKeyboardVisible,
  hidePreviewFromLogin
}) {
  const { session, role, setRole, logout } = useAuthStore();

  const handleLoginSuccess = (phone, role, token) => {
    useAuthStore.getState().loginSuccess(phone, role, token);
  };

  const renderScreen = () => {
    switch (role) {
      case 'Farmer':
        return (
          <AuthNavigator 
            onLoginSuccess={handleLoginSuccess} 
          />
        );
      case 'Vendor':
        return (
          <VendorScreen 
            loggedInPhone={session?.user?.phone}
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={logout}
          />
        );
      case 'ColdStorage':
        return (
          <FarmerNavigator 
            loggedInPhone={session?.user?.phone} 
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={logout}
          />
        );
      case 'ColdStorageFacility':
        return (
          <ColdStorageScreen 
            loggedInPhone={session?.user?.phone}
            onSwitchRole={() => setShowRoleSwitcher(true)}
            onLogout={logout}
          />
        );
      default:
        return <AuthNavigator onLoginSuccess={handleLoginSuccess} />;
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
