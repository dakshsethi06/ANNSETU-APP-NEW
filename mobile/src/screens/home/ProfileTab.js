import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../theme';
import AnnsetuLogo from '../../components/AnnsetuLogo';

export default function ProfileTab({ farmerData, onSwitchRole, onLogout }) {
  const profileName = farmerData?.name || 'SN Sharma Trading';
  const profileSubtitle = farmerData 
    ? `Farmer · ${farmerData.village || farmerData.district || 'Tundla'}, ${farmerData.state || 'UP'}` 
    : 'Vendor · Tundla, Firozabad';
  const currentRole = farmerData ? 'Farmer / किसान' : 'Vendor / व्यापारी';
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
      title: 'Support / सहायता',
      subtitle: 'Chat, tickets, help',
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
          <View style={s.shieldIcon}>
            <AnnsetuLogo size={22} backgroundColor="transparent" iconColor="#FFFFFF" />
          </View>
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
              <TouchableOpacity style={s.menuItem} activeOpacity={0.7}>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3EE',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E5C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E2D9',
    width: '100%',
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 104 : 84,
  },
  heroSection: {
    backgroundColor: '#1E5C2E',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  profileTextGroup: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  profileSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  kycDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981', // green dot
    marginRight: 6,
  },
  kycText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E2D9',
    marginHorizontal: 20,
    padding: 16,
    marginTop: -24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardLeft: {
    flex: 1,
  },
  roleCardLabel: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  roleCardValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E5C2E',
    marginTop: 2,
    fontFamily: FONTS.bold,
  },
  switchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E2D9',
    backgroundColor: '#FFFFFF',
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E2D9',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 92, 46, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F5F3EE',
    marginHorizontal: 20,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    fontFamily: FONTS.bold,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerLogoWrapper: {
    marginRight: 6,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
});
