import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { initiateDigiLocker, checkDigiLockerStatus, verifyBankAccountSync } from '../services/kycService';

const FONTS = {
  bold: 'System',
  medium: 'System',
  regular: 'System'
};

export default function KycWizardModal({ visible, onClose, farmerData, onRefreshProfile }) {
  const [activeStep, setActiveStep] = useState(1); // 1: Identity, 2: Bank, 3: Completed

  // Identity / DigiLocker state
  const [kycLoading, setKycLoading] = useState(false);
  const [kycWebViewVisible, setKycWebViewVisible] = useState(false);
  const [kycRedirectUrl, setKycRedirectUrl] = useState(null);
  const [kycVerificationId, setKycVerificationId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  // Bank Verification state
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [verifiedBankInfo, setVerifiedBankInfo] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);

  useEffect(() => {
    if (farmerData) {
      if (farmerData.accountNumber || farmerData.ifscCode) {
        setVerifiedBankInfo({
          maskedAccount: farmerData.accountNumber,
          ifsc: farmerData.ifscCode,
          registeredName: farmerData.accountHolderName || farmerData.name
        });
      }
    }
  }, [farmerData]);

  // Derived statuses
  const isIdentityVerified = !!(farmerData?.aadhaarNumber || farmerData?.panNumber);
  const isBankVerified = !!(verifiedBankInfo || farmerData?.accountNumber);
  const isFullKycComplete = isIdentityVerified && isBankVerified;

  // --- DigiLocker Flow ---
  const handleInitiateKyc = async () => {
    try {
      setKycLoading(true);
      const data = await initiateDigiLocker();
      if (data.success && data.redirect_url) {
        setKycRedirectUrl(data.redirect_url);
        setKycVerificationId(data.verification_id);
        setKycWebViewVisible(true);
      } else {
        throw new Error(data.error || 'Failed to get verification link.');
      }
    } catch (err) {
      Alert.alert('KYC Error', err.message || 'Unable to start DigiLocker verification.');
    } finally {
      setKycLoading(false);
    }
  };

  const startKycPolling = (vId) => {
    if (!vId) return;
    setIsPolling(true);
    let attempts = 0;
    const maxAttempts = 15;

    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await checkDigiLockerStatus(vId);
        if (res.success && res.status === 'SUCCESS') {
          clearInterval(interval);
          setIsPolling(false);
          if (onRefreshProfile) onRefreshProfile();
          Alert.alert('Identity Verified!', 'Your Aadhaar & PAN details have been verified via DigiLocker.');
          // If bank is also verified, jump to step 3, else jump to step 2
          if (isBankVerified) {
            setActiveStep(3);
          } else {
            setActiveStep(2);
          }
        } else if (res.status === 'EXPIRED' || res.status === 'FAILED') {
          clearInterval(interval);
          setIsPolling(false);
          Alert.alert('Verification Failed', res.error || 'Verification attempt failed or expired.');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsPolling(false);
          Alert.alert('Polling Timeout', 'Verification process timed out. Please try again.');
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsPolling(false);
        }
      }
    }, 3000);
  };

  // --- Bank Account Verification ---
  const handleVerifyBank = async () => {
    if (!accountNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your bank account number.');
      return;
    }
    if (accountNumber.trim() !== confirmAccount.trim()) {
      Alert.alert('Validation Error', 'Bank account numbers do not match.');
      return;
    }
    if (!ifscCode.trim() || ifscCode.trim().length !== 11) {
      Alert.alert('Validation Error', 'Please enter a valid 11-digit IFSC code.');
      return;
    }

    try {
      setBankLoading(true);
      const result = await verifyBankAccountSync(
        accountNumber.trim(),
        ifscCode.trim().toUpperCase(),
        farmerData?.name
      );

      if (result && result.success) {
        setVerifiedBankInfo(result);
        setShowBankForm(false);
        if (onRefreshProfile) onRefreshProfile();
        Alert.alert(
          'Bank Account Verified! 🟢',
          `Account Holder: ${result.registeredName}\nAccount Status: VALID`
        );
        if (isIdentityVerified) {
          setActiveStep(3);
        }
      } else {
        throw new Error(result?.error || 'Bank account verification failed.');
      }
    } catch (err) {
      Alert.alert('Verification Error', err.message || 'Failed to verify bank account.');
    } finally {
      setBankLoading(false);
    }
  };


  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="close-outline" size={26} color="#1E5C2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC & Security / केवाइसी एवं सुरक्षा</Text>
        </View>

        {/* Stepper Header */}
        <View style={styles.stepperContainer}>
          <TouchableOpacity style={styles.stepItem} onPress={() => setActiveStep(1)}>
            <View style={[styles.stepCircle, activeStep === 1 && styles.stepCircleActive, isIdentityVerified && styles.stepCircleCompleted]}>
              {isIdentityVerified ? (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              ) : (
                <Text style={[styles.stepNumber, activeStep === 1 && styles.stepNumberActive]}>1</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, activeStep === 1 && styles.stepLabelActive]}>Identity</Text>
          </TouchableOpacity>

          <View style={[styles.stepLine, isIdentityVerified && styles.stepLineCompleted]} />

          <TouchableOpacity style={styles.stepItem} onPress={() => setActiveStep(2)}>
            <View style={[styles.stepCircle, activeStep === 2 && styles.stepCircleActive, isBankVerified && styles.stepCircleCompleted]}>
              {isBankVerified ? (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              ) : (
                <Text style={[styles.stepNumber, activeStep === 2 && styles.stepNumberActive]}>2</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, activeStep === 2 && styles.stepLabelActive]}>Bank</Text>
          </TouchableOpacity>

          <View style={[styles.stepLine, isFullKycComplete && styles.stepLineCompleted]} />

          <TouchableOpacity style={styles.stepItem} onPress={() => setActiveStep(3)}>
            <View style={[styles.stepCircle, activeStep === 3 && styles.stepCircleActive, isFullKycComplete && styles.stepCircleCompleted]}>
              {isFullKycComplete ? (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              ) : (
                <Text style={[styles.stepNumber, activeStep === 3 && styles.stepNumberActive]}>3</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, activeStep === 3 && styles.stepLabelActive]}>Summary</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* STEP 1: IDENTITY */}
          {activeStep === 1 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="finger-print-outline" size={24} color="#1E5C2E" />
                <Text style={styles.cardTitle}>Identity Verification (DigiLocker)</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Verify your Aadhaar & PAN details automatically using government DigiLocker.
              </Text>

              {isIdentityVerified ? (
                <View style={styles.statusVerifiedBox}>
                  <Ionicons name="checkmark-circle" size={22} color="#137333" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.statusVerifiedTitle}>Identity Verified / पहचान सत्यापित</Text>
                    {farmerData?.aadhaarNumber && (
                      <Text style={styles.statusVerifiedDetail}>Aadhaar: {farmerData.aadhaarNumber}</Text>
                    )}
                    {farmerData?.panNumber && (
                      <Text style={styles.statusVerifiedDetail}>PAN: {farmerData.panNumber}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.statusPendingBox}>
                  <Ionicons name="time-outline" size={20} color="#D97706" />
                  <Text style={styles.statusPendingText}>Identity Status: Pending / लंबित</Text>
                </View>
              )}

              <TouchableOpacity
                style={isIdentityVerified ? styles.secondaryButton : styles.primaryButton}
                onPress={handleInitiateKyc}
                disabled={kycLoading || isPolling}
              >
                {kycLoading || isPolling ? (
                  <ActivityIndicator color={isIdentityVerified ? "#1E5C2E" : "#ffffff"} />
                ) : (
                  <Text style={isIdentityVerified ? styles.secondaryButtonText : styles.primaryButtonText}>
                    {isIdentityVerified ? 'Re-verify via DigiLocker' : 'Verify Aadhaar & PAN'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextStepButton} onPress={() => setActiveStep(2)}>
                <Text style={styles.nextStepButtonText}>Next: Bank Account Verification →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: BANK ACCOUNT */}
          {activeStep === 2 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="card-outline" size={24} color="#1E5C2E" />
                <Text style={styles.cardTitle}>Bank Account Verification</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Instant ₹1 bank verification powered by Cashfree. Ensure payments are credited safely.
              </Text>

              {isBankVerified && !showBankForm ? (
                <View>
                  <View style={styles.statusVerifiedBox}>
                    <Ionicons name="checkmark-circle" size={22} color="#137333" />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.statusVerifiedTitle}>Bank Account Verified 🟢</Text>
                      <Text style={styles.statusVerifiedDetail}>
                        Holder: {verifiedBankInfo?.registeredName || farmerData?.accountHolderName || farmerData?.name}
                      </Text>
                      <Text style={styles.statusVerifiedDetail}>
                        Account: {verifiedBankInfo?.maskedAccount || farmerData?.accountNumber} | IFSC: {verifiedBankInfo?.ifsc || farmerData?.ifscCode}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setShowBankForm(true)}
                  >
                    <Text style={styles.secondaryButtonText}>Re-verify / Update Bank Details</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {!isBankVerified && (
                    <View style={styles.statusPendingBox}>
                      <Ionicons name="time-outline" size={20} color="#D97706" />
                      <Text style={styles.statusPendingText}>Bank Status: Pending / लंबित</Text>
                    </View>
                  )}

                  <View style={{ marginVertical: 12 }}>
                    <Text style={styles.inputLabel}>Bank Account Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter Account Number"
                      keyboardType="number-pad"
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                    />

                    <Text style={styles.inputLabel}>Confirm Account Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter Account Number"
                      keyboardType="number-pad"
                      value={confirmAccount}
                      onChangeText={setConfirmAccount}
                    />

                    <Text style={styles.inputLabel}>IFSC Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. HDFC0000001"
                      autoCapitalize="characters"
                      value={ifscCode}
                      onChangeText={(val) => setIfscCode(val.toUpperCase())}
                    />

                    <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyBank} disabled={bankLoading}>
                      {bankLoading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify Bank Account</Text>
                      )}
                    </TouchableOpacity>

                    {isBankVerified && (
                      <TouchableOpacity
                        style={{ alignSelf: 'center', marginTop: 10 }}
                        onPress={() => setShowBankForm(false)}
                      >
                        <Text style={{ color: '#6B7280', fontSize: 14 }}>Cancel / Keep Existing Details</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.nextStepButton} onPress={() => setActiveStep(3)}>
                <Text style={styles.nextStepButtonText}>Next: View KYC Summary →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: SUMMARY */}
          {activeStep === 3 && (
            <View style={styles.card}>
              <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <Ionicons
                  name={isFullKycComplete ? "ribbon-outline" : "alert-circle-outline"}
                  size={54}
                  color={isFullKycComplete ? "#137333" : "#D97706"}
                />
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E5C2E', marginTop: 10 }}>
                  {isFullKycComplete ? 'Full KYC Verified! 🟢' : 'KYC Verification In Progress'}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
                  {isFullKycComplete
                    ? 'Your identity & bank account details are verified and compliant.'
                    : 'Complete both Identity and Bank Verification to receive full verified status.'}
                </Text>
              </View>

              {/* Summary Cards */}
              <View style={styles.summaryRow}>
                <Ionicons name={isIdentityVerified ? "checkmark-circle" : "ellipse-outline"} size={24} color={isIdentityVerified ? "#137333" : "#9CA3AF"} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.summaryTitle}>1. Identity (Aadhaar & PAN)</Text>
                  <Text style={styles.summarySub}>
                    {isIdentityVerified ? `Verified (${farmerData?.aadhaarNumber || 'DigiLocker'})` : 'Pending Verification'}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Ionicons name={isBankVerified ? "checkmark-circle" : "ellipse-outline"} size={24} color={isBankVerified ? "#137333" : "#9CA3AF"} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.summaryTitle}>2. Bank Account</Text>
                  <Text style={styles.summarySub}>
                    {isBankVerified
                      ? `Verified (${verifiedBankInfo?.maskedAccount || farmerData?.accountNumber || 'Bank Valid'})`
                      : 'Pending Verification'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>Finish / Return to Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* DigiLocker WebView Modal */}
        <Modal visible={kycWebViewVisible} animationType="slide" onRequestClose={() => setKycWebViewVisible(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>DigiLocker Verification</Text>
              <TouchableOpacity onPress={() => setKycWebViewVisible(false)}>
                <Text style={{ color: '#1E5C2E', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
            {kycRedirectUrl ? (
              <WebView
                source={{ uri: kycRedirectUrl }}
                onNavigationStateChange={(navState) => {
                  if (navState.url.includes('/api/kyc/digilocker/callback')) {
                    setKycWebViewVisible(false);
                    startKycPolling(kycVerificationId);
                  }
                }}
              />
            ) : null}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  stepItem: {
    alignItems: 'center'
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepCircleActive: {
    backgroundColor: '#1E5C2E'
  },
  stepCircleDone: {
    backgroundColor: '#137333'
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B'
  },
  stepNumberActive: {
    color: '#ffffff'
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4
  },
  stepLabelActive: {
    color: '#1E5C2E',
    fontWeight: '800'
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8
  },
  stepLineDone: {
    backgroundColor: '#137333'
  },
  content: {
    padding: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E1A',
    marginLeft: 8,
    fontFamily: FONTS.bold
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18
  },
  statusVerifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16
  },
  statusVerifiedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#137333'
  },
  statusVerifiedDetail: {
    fontSize: 12,
    color: '#137333',
    marginTop: 2
  },
  statusPendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  statusPendingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 8
  },
  primaryButton: {
    backgroundColor: '#1E5C2E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  secondaryButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700'
  },
  nextStepButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6
  },
  nextStepButtonText: {
    color: '#1E5C2E',
    fontSize: 13,
    fontWeight: '700'
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 6
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B'
  },
  sampleDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginVertical: 10
  },
  sampleDataText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5C2E',
    marginLeft: 4
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937'
  },
  summarySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  }
});
