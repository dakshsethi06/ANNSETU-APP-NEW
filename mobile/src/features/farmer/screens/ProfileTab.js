import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, StatusBar, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../../core/theme/theme';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import s from '../styles/profileTabStyles';
import { useTranslation } from 'react-i18next';
import { updateFarmerProfile, sendProfileVerificationOtp, verifyAndUpdateFarmerProfile } from '../services/farmerService';
import SupportModal from '../../support/modals/SupportModal';

export default function ProfileTab({ farmerData, onSwitchRole, onLogout, onRefreshFarmer }) {
  const { t, i18n } = useTranslation();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Edit Profile modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // OTP Verification state
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTarget, setOtpTarget] = useState({ type: 'phone', value: '' });

  export default function ProfileTab({ farmerData, onSwitchRole, onLogout, loggedInPhone, userRole }) {
    const [supportModalVisible, setSupportModalVisible] = useState(false);
    const profileName = farmerData?.name || 'SN Sharma Trading';
    const roleLabel = farmerData ? t('register.roles.farmer.label') : t('register.roles.vendor.label');
    const profileSubtitle = farmerData
      ? `${roleLabel} · ${farmerData.village || farmerData.district || 'Tundla'}, ${farmerData.state || 'UP'}`
      : `${roleLabel} · Tundla, Firozabad`;
    const currentRole = farmerData
      ? t('profile.farmer_role_display')
      : t('profile.vendor_role_display');

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
        title: t('profile.settings_menu_edit'),
        subtitle: t('profile.settings_menu_edit_sub'),
        icon: 'user',
      },
      {
        id: '2',
        title: t('profile.settings_menu_contact'),
        subtitle: t('profile.settings_menu_contact_sub'),
        icon: 'phone',
      },
      {
        id: '3',
        title: t('profile.settings_menu_security'),
        subtitle: t('profile.settings_menu_security_sub'),
        icon: 'shield',
      },
      {
        id: '4',
        title: t('profile.settings_menu_docs'),
        subtitle: t('profile.settings_menu_docs_sub'),
        icon: 'file-text',
      },
      {
        id: '5',
        title: t('profile.settings_menu_reports'),
        subtitle: t('profile.settings_menu_reports_sub'),
        icon: 'bar-chart-2',
      },
      {
        id: '6',
        title: t('profile.settings_menu_support'),
        subtitle: t('profile.settings_menu_support_sub'),
        title: 'Contact Support / सहायता',
        subtitle: 'Chat, tickets, help / चैट, टिकट, मदद',
        icon: 'message-square',
      },
      {
        id: '7',
        title: t('profile.settings_menu_app'),
        subtitle: t('profile.settings_menu_app_sub'),
        icon: 'settings',
      },
    ];

    const handleOpenEditModal = () => {
      setEditName(farmerData?.name || '');
      setEditPhone(farmerData?.phone || '');
      setEditEmail(farmerData?.email || '');
      setErrorMessage('');
      setIsVerifyingOtp(false);
      setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
      if (!editName.trim()) {
        setErrorMessage(t('profile.validation_error_name'));
        return;
      }
      const cleanPhone = editPhone.trim();
      if (!cleanPhone || cleanPhone.length !== 10 || isNaN(cleanPhone)) {
        setErrorMessage(t('profile.validation_error_phone'));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = editEmail.trim().toLowerCase();
      if (cleanEmail && !emailRegex.test(cleanEmail)) {
        setErrorMessage(t('profile.validation_error_email'));
        return;
      }

      const originalPhone = (farmerData?.phone || '').trim();
      const originalEmail = (farmerData?.email || '').trim().toLowerCase();

      const isPhoneChanged = cleanPhone !== originalPhone;
      const isEmailChanged = (cleanEmail || null) !== (originalEmail || null);

      const serialNumber = farmerData?.serial_number || farmerData?.id;
      if (!serialNumber) {
        setErrorMessage('Farmer identifier not found.');
        return;
      }

      setLoadingSave(true);
      setErrorMessage('');

      try {
        if (isPhoneChanged) {
          // Trigger OTP Verification for Phone Number
          setOtpTarget({ type: 'phone', value: cleanPhone });
          await sendProfileVerificationOtp(serialNumber, 'phone', cleanPhone);
          setOtpCode('');
          setIsVerifyingOtp(true);
        } else if (isEmailChanged) {
          // Trigger OTP Verification for Email Address
          setOtpTarget({ type: 'email', value: cleanEmail });
          await sendProfileVerificationOtp(serialNumber, 'email', cleanEmail);
          setOtpCode('');
          setIsVerifyingOtp(true);
        } else {
          // Only Name changed (or no changes at all) - direct save
          await updateFarmerProfile(serialNumber, {
            name: editName.trim(),
            phone: cleanPhone,
            email: cleanEmail || null,
          });

          if (onRefreshFarmer) {
            await onRefreshFarmer();
          }
          setEditModalVisible(false);
          Alert.alert(t('profile.title'), t('profile.save_success'));
        }
      } catch (err) {
        console.warn('Error starting profile update:', err.message);
        setErrorMessage(err.message || 'Failed to request verification.');
      } finally {
        setLoadingSave(false);
      }
    };

    const handleVerifyOtp = async () => {
      if (!otpCode.trim() || otpCode.trim().length !== 6 || isNaN(otpCode.trim())) {
        setErrorMessage(t('profile.enter_otp_placeholder'));
        return;
      }

      setLoadingSave(true);
      setErrorMessage('');

      try {
        const serialNumber = farmerData?.serial_number || farmerData?.id;

        // Perform verify and update on the backend
        await verifyAndUpdateFarmerProfile(
          serialNumber,
          otpTarget.type,
          otpTarget.value,
          otpCode.trim(),
          { name: editName.trim() }
        );

        // Now check if the other field also changed (e.g. if we verified phone first, but email also changed)
        const cleanPhone = editPhone.trim();
        const cleanEmail = editEmail.trim().toLowerCase();
        const originalEmail = (farmerData?.email || '').trim().toLowerCase();
        const isEmailChanged = (cleanEmail || null) !== (originalEmail || null);

        if (otpTarget.type === 'phone' && isEmailChanged) {
          // Phone verification succeeded! Now trigger Email verification sequentially
          setOtpTarget({ type: 'email', value: cleanEmail });
          await sendProfileVerificationOtp(serialNumber, 'email', cleanEmail);
          setOtpCode('');
          setErrorMessage('');
          Alert.alert(t('profile.title'), 'Phone number verified! Now enter the OTP sent to your new email.');
        } else {
          // Verification complete!
          if (onRefreshFarmer) {
            await onRefreshFarmer();
          }
          setEditModalVisible(false);
          setIsVerifyingOtp(false);
          Alert.alert(t('profile.title'), t('profile.save_success'));
        }
      } catch (err) {
        console.warn('Error verifying OTP:', err.message);
        setErrorMessage(t('profile.invalid_otp_error'));
      } finally {
        setLoadingSave(false);
      }
    };

    const handleResendOtp = async () => {
      setLoadingSave(true);
      setErrorMessage('');
      try {
        const serialNumber = farmerData?.serial_number || farmerData?.id;
        await sendProfileVerificationOtp(serialNumber, otpTarget.type, otpTarget.value);
        Alert.alert(t('profile.title'), 'A new OTP has been sent.');
      } catch (err) {
        setErrorMessage(err.message || 'Failed to resend OTP.');
      } finally {
        setLoadingSave(false);
      }
    };

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

                {/* Sensitive Details displayed directly in the settings tab hero section */}
                {farmerData?.phone ? (
                  <Text style={[s.profileSubtitle, { marginTop: 4, opacity: 0.9 }]}>
                    📞 {farmerData.phone}
                  </Text>
                ) : null}
                {farmerData?.email ? (
                  <Text style={[s.profileSubtitle, { marginTop: 2, opacity: 0.9 }]}>
                    ✉️ {farmerData.email}
                  </Text>
                ) : null}

                <View style={s.kycBadge}>
                  <View style={s.kycDot} />
                  <Text style={s.kycText}>{t('profile.kyc_verified')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Current Role Card Overlay */}
          <View style={s.roleCard}>
            <View style={s.roleCardLeft}>
              <Text style={s.roleCardLabel}>{t('profile.current_role')}</Text>
              <Text style={s.roleCardValue}>{currentRole}</Text>
            </View>
            {onSwitchRole ? (
              <TouchableOpacity style={s.switchBtn} onPress={onSwitchRole} activeOpacity={0.8}>
                <Text style={s.switchBtnText}>{t('profile.switch_role')}</Text>
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
                  onPress={
                    item.id === '1' || item.id === '2'
                      ? handleOpenEditModal
                      : item.id === '7'
                        ? () => setSettingsModalVisible(true)
                        : undefined
                  }
                >
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
            <Text style={s.logoutBtnText}>{t('profile.logout_btn')}</Text>
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

        {/* Edit Profile Details Modal */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setEditModalVisible(false);
            setIsVerifyingOtp(false);
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '90%', backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>

              {!isVerifyingOtp ? (
                // EDIT FORM VIEW
                <>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E5C2E', marginBottom: 16, fontFamily: FONTS.bold }}>
                    {t('profile.edit_profile_title')}
                  </Text>

                  {/* Error Message */}
                  {errorMessage ? (
                    <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 12, fontFamily: FONTS.regular }}>
                      {errorMessage}
                    </Text>
                  ) : null}

                  {/* Full Name field */}
                  <Text style={{ fontSize: 12, color: '#71717A', marginBottom: 4, fontFamily: FONTS.bold }}>
                    {t('profile.full_name_label')}
                  </Text>
                  <TextInput
                    style={{
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#E5E2D9',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      marginBottom: 14,
                      fontFamily: FONTS.regular,
                      color: '#1A2E1A',
                      backgroundColor: '#FFFFFF',
                    }}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="e.g. SN Sharma"
                  />

                  {/* User Role (Disabled / Read-only) */}
                  <Text style={{ fontSize: 12, color: '#71717A', marginBottom: 4, fontFamily: FONTS.bold }}>
                    {t('profile.role_label')}
                  </Text>
                  <TextInput
                    style={{
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#E5E2D9',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      marginBottom: 14,
                      fontFamily: FONTS.regular,
                      color: '#71717A',
                      backgroundColor: '#F3F4F6',
                    }}
                    value={currentRole}
                    editable={false}
                    selectTextOnFocus={false}
                  />

                  {/* Phone Number field */}
                  <Text style={{ fontSize: 12, color: '#71717A', marginBottom: 4, fontFamily: FONTS.bold }}>
                    {t('profile.phone_number_label')}
                  </Text>
                  <TextInput
                    style={{
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#E5E2D9',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      marginBottom: 14,
                      fontFamily: FONTS.regular,
                      color: '#1A2E1A',
                      backgroundColor: '#FFFFFF',
                    }}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                  />

                  {/* Email Address field */}
                  <Text style={{ fontSize: 12, color: '#71717A', marginBottom: 4, fontFamily: FONTS.bold }}>
                    {t('profile.email_address_label')}
                  </Text>
                  <TextInput
                    style={{
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#E5E2D9',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      marginBottom: 20,
                      fontFamily: FONTS.regular,
                      color: '#1A2E1A',
                      backgroundColor: '#FFFFFF',
                    }}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="example@email.com"
                  />

                  {/* Action buttons row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        backgroundColor: '#F5F3EE',
                        borderRadius: 12,
                        alignItems: 'center',
                        marginRight: 10,
                      }}
                      onPress={() => setEditModalVisible(false)}
                      disabled={loadingSave}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#71717A', fontFamily: FONTS.bold }}>
                        {t('profile.cancel_btn')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        backgroundColor: '#1E5C2E',
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handleSaveProfile}
                      disabled={loadingSave}
                    >
                      {loadingSave ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff', fontFamily: FONTS.bold }}>
                          {t('profile.save_changes_btn')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // OTP VERIFICATION VIEW
                <>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E5C2E', marginBottom: 10, fontFamily: FONTS.bold }}>
                    {t('profile.otp_modal_title')}
                  </Text>

                  <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 16, fontFamily: FONTS.regular }}>
                    {t('profile.otp_sent_message')} {otpTarget.type === 'phone' ? 'phone number' : 'email address'}:
                    {"\n"}<Text style={{ fontWeight: 'bold', color: '#1A2E1A' }}>{otpTarget.value}</Text>
                  </Text>

                  {/* Error Message */}
                  {errorMessage ? (
                    <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 12, fontFamily: FONTS.regular }}>
                      {errorMessage}
                    </Text>
                  ) : null}

                  <TextInput
                    style={{
                      height: 48,
                      borderWidth: 1,
                      borderColor: '#E5E2D9',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      marginBottom: 16,
                      fontFamily: FONTS.regular,
                      fontSize: 16,
                      color: '#1A2E1A',
                      backgroundColor: '#FFFFFF',
                      textAlign: 'center',
                      letterSpacing: 4,
                    }}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder={t('profile.enter_otp_placeholder')}
                  />

                  {/* Action buttons row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        backgroundColor: '#F5F3EE',
                        borderRadius: 12,
                        alignItems: 'center',
                        marginRight: 10,
                      }}
                      onPress={() => setIsVerifyingOtp(false)}
                      disabled={loadingSave}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#71717A', fontFamily: FONTS.bold }}>
                        {t('profile.back_btn')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        backgroundColor: '#1E5C2E',
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handleVerifyOtp}
                      disabled={loadingSave}
                    >
                      {loadingSave ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff', fontFamily: FONTS.bold }}>
                          {t('profile.verify_confirm_btn')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Resend OTP button */}
                  <TouchableOpacity
                    style={{ alignSelf: 'center', padding: 8 }}
                    onPress={handleResendOtp}
                    disabled={loadingSave}
                  >
                    <Text style={{ fontSize: 13, color: '#1E5C2E', fontWeight: '700', fontFamily: FONTS.bold, textDecorationLine: 'underline' }}>
                      {t('profile.resend_otp_btn')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </View>
        </Modal>

        {/* Language / App Settings Modal */}
        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '90%', backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E5C2E', marginBottom: 6, fontFamily: FONTS.bold }}>
                {t('profile.select_language_title')}
              </Text>
              <Text style={{ fontSize: 13, color: '#71717A', marginBottom: 20, fontFamily: FONTS.regular }}>
                {t('profile.select_language_sub')}
              </Text>

              {/* EN Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: i18n.language === 'en' ? 'rgba(30, 92, 46, 0.08)' : '#F5F3EE',
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: i18n.language === 'en' ? '#1E5C2E' : 'transparent',
                }}
                onPress={() => {
                  i18n.changeLanguage('en');
                  setSettingsModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: i18n.language === 'en' ? '#1E5C2E' : '#1A2E1A', fontFamily: FONTS.bold }}>English</Text>
                {i18n.language === 'en' && <Feather name="check" size={16} color="#1E5C2E" />}
              </TouchableOpacity>

              {/* HI Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: i18n.language === 'hi' ? 'rgba(30, 92, 46, 0.08)' : '#F5F3EE',
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: i18n.language === 'hi' ? '#1E5C2E' : 'transparent',
                }}
                onPress={() => {
                  i18n.changeLanguage('hi');
                  setSettingsModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: i18n.language === 'hi' ? '#1E5C2E' : '#1A2E1A', fontFamily: FONTS.bold }}>हिंदी (Hindi)</Text>
                {i18n.language === 'hi' && <Feather name="check" size={16} color="#1E5C2E" />}
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  backgroundColor: '#1E5C2E',
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff', fontFamily: FONTS.bold }}>
                  {t('profile.close_btn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
