import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../../core/theme/theme';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import s from '../styles/profileTabStyles';
import SupportModal from '../../support/modals/SupportModal';

export default function ProfileTab({ farmerData, onSwitchRole, onLogout, loggedInPhone, userRole }) {
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const profileName = farmerData?.name || 'SN Sharma Trading';
  
  const isColdStorage = userRole === 'ColdStorage' || userRole === 'ColdStorageFacility';
  const currentRole = isColdStorage 
    ? 'Cold Storage / कोल्ड स्टोरेज' 
    : farmerData 
      ? 'Farmer / किसान' 
      : 'Vendor / व्यापारी';

  const profileSubtitle = isColdStorage
    ? `Cold Storage · ${farmerData?.village || farmerData?.district || 'Tundla'}, ${farmerData?.state || 'UP'}`
    : farmerData
      ? `Farmer · ${farmerData.village || farmerData.district || 'Tundla'}, ${farmerData.state || 'UP'}`
      : 'Vendor · Tundla, Firozabad';

  const avatarChar = profileName ? profileName.charAt(0).toUpperCase() : 'S';

  const menuItems = [
    {
      id: '1',
      title: 'Edit Profile',
      subtitle: 'Name, address, KYC',
      icon: 'user',
    },
    {
      id: '2',
      title: 'Contact & Communication',
      subtitle: 'Phone, WhatsApp alerts',
      icon: 'phone',
    },
    {
      id: '3',
      title: 'Security & KYC',
      subtitle: 'Password, documents',
      icon: 'shield',
    },
    {
      id: '4',
      title: 'My Documents',
      subtitle: 'Parchi, invoices, statements',
      icon: 'file-text',
    },
    {
      id: '5',
      title: 'Reports & Analytics',
      subtitle: 'Download reports',
      icon: 'bar-chart-2',
    },
    {
      id: '6',
      title: 'Contact Support / सहायता',
      subtitle: 'Chat, tickets, help / चैट, टिकट, मदद',
      icon: 'message-square',
    },
    {
      id: '7',
      title: 'App Settings',
      subtitle: 'Language, notifications',
      icon: 'settings',
    },
  ];

  return (
    <SafeAreaView style={s.safeArea}>
      {/* Status Bar Spacer for Android */}
      {Platform.OS === 'android' && (
        <View style={{ height: StatusBar.currentHeight, backgroundColor: '#F5F3EE' }} />
      )}

      {/* Top Header */}
      <View style={s.topHeader}>
        <View style={s.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={s.brandTitle}>Annsetu</Text>
        </View>
      </View>

      <View style={s.divider} />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Green Hero Section */}
        <View style={s.heroSection}>
          <View style={s.profileRow}>
            {/* Avatar Box (translucent white box with dynamic letter) */}
            <View style={s.avatarBox}>
              <Text style={s.avatarLetter}>{avatarChar}</Text>
            </View>

            <View style={s.profileTextGroup}>
              <Text style={s.profileName}>{profileName}</Text>
              <Text style={s.profileSubtitle}>{profileSubtitle}</Text>
              <View style={s.kycBadge}>
                <View style={s.kycDot} />
                <Text style={s.kycText}>KYC Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Current Role Card Overlay */}
        <View style={s.roleCard}>
          <View style={s.roleCardLeft}>
            <Text style={s.roleCardLabel}>Current Role</Text>
            <Text style={s.roleCardValue}>{currentRole}</Text>
          </View>
          {onSwitchRole ? (
            <TouchableOpacity style={s.switchBtn} onPress={onSwitchRole} activeOpacity={0.8}>
              <Text style={s.switchBtnText}>Switch Role</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Menu Cards Container */}
        <View style={s.menuCard}>
          {menuItems.map((item, idx) => (
            <View key={item.id}>
              <TouchableOpacity 
                style={s.menuItem} 
                activeOpacity={0.7}
                onPress={() => {
                  if (item.id === '6') {
                    setSupportModalVisible(true);
                  } else {
                    Alert.alert(
                      item.title,
                      `${item.title} section is coming soon!`,
                      [{ text: 'OK' }]
                    );
                  }
                }}
              >
                <View style={s.menuItemLeft}>
                  <View style={s.menuIconBadge}>
                    <Feather name={item.icon} size={18} color="#71717A" />
                  </View>
                  <View>
                    <Text style={s.menuItemTitle}>{item.title}</Text>
                    <Text style={s.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#A1A1AA" />
              </TouchableOpacity>
              {idx < menuItems.length - 1 && <View style={s.menuDivider} />}
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={s.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Feather name="log-out" size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={s.logoutBtnText}>Logout</Text>
        </TouchableOpacity>

        {/* Brand version footer */}
        <View style={s.footerContainer}>
          <View style={s.footerLogoWrapper}>
            <AnnsetuLogo size={16} backgroundColor="transparent" iconColor="#71717A" />
          </View>
          <Text style={s.footerText}>
            Annsetu v2.1.0 · Made with ❤️ for Indian farmers
          </Text>
        </View>
      </ScrollView>

      <SupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        userName={profileName}
        userPhone={loggedInPhone || farmerData?.phone}
        userRole={userRole || (farmerData ? 'Farmer' : 'Vendor')}
      />
    </SafeAreaView>
  );
}


