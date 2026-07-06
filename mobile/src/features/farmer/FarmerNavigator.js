import React from 'react';
import HomeScreen from './screens/HomeScreen';

/**
 * Farmer feature local navigator/container
 */
export default function FarmerNavigator({ loggedInPhone, onSwitchRole, onLogout }) {
  return (
    <HomeScreen 
      loggedInPhone={loggedInPhone}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
    />
  );
}
