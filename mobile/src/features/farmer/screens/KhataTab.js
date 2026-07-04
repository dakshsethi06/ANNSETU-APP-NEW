import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import styles from '../styles/khataTabStyles';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import { useKhataPayment } from '../hooks/useKhataPayment';

// Components and Modals
import KhataSummaryView from '../components/KhataSummaryView';
import KhataVerificationView from '../components/KhataVerificationView';
import PaymentWebViewModal from '../modals/PaymentWebViewModal';
import DatePickerModal from '../modals/DatePickerModal';
import SuccessModal from '../modals/SuccessModal';

export default function KhataTab({ farmerData, ledgerList = [], holdingsList = [], userRole = 'farmer', onPaymentSuccess }) {
  const { state, handlers } = useKhataPayment(farmerData, holdingsList, onPaymentSuccess);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatPrice = (val) => {
    const isNegative = val < 0;
    return `${isNegative ? '-' : '+'}₹${Math.abs(val).toLocaleString('en-IN')}`;
  };

  const totalCharged = ledgerList.reduce((sum, item) => item.amount < 0 ? sum + Math.abs(item.amount) : sum, 0);
  const totalPaid = ledgerList.reduce((sum, item) => item.amount > 0 ? sum + item.amount : sum, 0);

  if (state.showSummary) {
    return (
      <View style={{ flex: 1 }}>
        <KhataSummaryView
          lang={state.lang}
          pendingRent={state.pendingRent}
          farmerData={farmerData}
          holdingsList={holdingsList}
          formatDate={formatDate}
          onBackPress={() => state.setShowSummary(false)}
          onPayNow={handlers.handleOnlineCheckout}
          onAlreadyPaid={() => {
            state.setShowSummary(false);
            state.setShowVerificationForm(true);
          }}
        />
        <PaymentWebViewModal
          visible={!!state.paymentUrl}
          paymentUrl={state.paymentUrl}
          lang={state.lang}
          onClose={() => state.setPaymentUrl(null)}
          onPaymentSuccess={() => {
            state.setPaymentUrl(null);
            state.setIsOnlineSuccess(true);
            state.setVerificationSuccessModalVisible(true);
          }}
        />
        <SuccessModal
          visible={state.verificationSuccessModalVisible}
          lang={state.lang}
          title={state.isOnlineSuccess ? (state.lang === 'en' ? 'Payment Successful' : 'भुगतान सफल') : undefined}
          message={state.isOnlineSuccess
            ? (state.lang === 'en' ? 'Your payment has been successfully processed. Dues are cleared.' : 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।')
            : undefined
          }
          onClose={() => {
            state.setVerificationSuccessModalVisible(false);
            state.setIsOnlineSuccess(false);
            handlers.handleResetAll();
          }}
        />
      </View>
    );
  }

  if (state.showVerificationForm) {
    return (
      <View style={{ flex: 1 }}>
        {state.verificationStep === 1 ? (
          <KhataVerificationView
            lang={state.lang}
            pendingRent={state.pendingRent}
            holdingsList={holdingsList}
            utrNumber={state.utrNumber}
            setUtrNumber={state.setUtrNumber}
            receiptFile={state.receiptFile}
            receiptFileName={state.receiptFileName}
            setReceiptFile={state.setReceiptFile}
            setReceiptFileName={state.setReceiptFileName}
            paymentDate={state.paymentDate}
            onUploadReceipt={handlers.handleUploadReceipt}
            onOpenDatePicker={() => {
              state.setPickerDay(state.paymentDate.getDate());
              state.setPickerMonth(state.paymentDate.getMonth());
              state.setPickerYear(state.paymentDate.getFullYear());
              state.setDatePickerVisible(true);
            }}
            onSubmit={handlers.handleFormSubmit}
            onBackPress={() => {
              state.setShowVerificationForm(false);
              state.setShowSummary(true);
            }}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: '#FAF7F0' }} />
        )}

        <DatePickerModal
          visible={state.datePickerVisible}
          lang={state.lang}
          pickerDay={state.pickerDay}
          pickerMonth={state.pickerMonth}
          pickerYear={state.pickerYear}
          adjustDay={handlers.adjustDay}
          adjustMonth={handlers.adjustMonth}
          adjustYear={handlers.adjustYear}
          onCancel={() => state.setDatePickerVisible(false)}
          onConfirm={handlers.handleConfirmDate}
        />

        <SuccessModal
          visible={state.verificationSuccessModalVisible}
          lang={state.lang}
          title={state.isOnlineSuccess ? (state.lang === 'en' ? 'Payment Successful' : 'भुगतान सफल') : undefined}
          message={state.isOnlineSuccess
            ? (state.lang === 'en' ? 'Your payment has been successfully processed. Dues are cleared.' : 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।')
            : undefined
          }
          onClose={() => {
            state.setVerificationSuccessModalVisible(false);
            state.setIsOnlineSuccess(false);
            handlers.handleResetAll();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
        <View style={styles.headerLangToggle}>
          <TouchableOpacity
            style={[styles.headerLangButton, state.lang === 'en' && styles.headerLangButtonActive]}
            onPress={() => state.setLang('en')}
          >
            <Text style={[styles.headerLangText, state.lang === 'en' && styles.headerLangTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerLangButton, state.lang === 'hi' && styles.headerLangButtonActive]}
            onPress={() => state.setLang('hi')}
          >
            <Text style={[styles.headerLangText, state.lang === 'hi' && styles.headerLangTextActive]}>हि</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>{state.lang === 'en' ? 'Net Balance' : 'शेष राशि'}</Text>
          <Text style={styles.balanceAmount}>₹{state.pendingRent.toLocaleString('en-IN')}</Text>
          <Text style={styles.balanceSub}>{state.lang === 'en' ? 'Dues Pending' : 'देनदारी बाकी'}</Text>

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.btnStatement}
              activeOpacity={0.8}
              onPress={() => Alert.alert(state.lang === 'en' ? 'Download' : 'डाउनलोड', state.lang === 'en' ? 'Downloading...' : 'डाउनलोड हो रहा है...')}
            >
              <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnStatementText}>{state.lang === 'en' ? 'Statement' : 'विवरण'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPay}
              activeOpacity={0.9}
              onPress={handlers.handlePayPress}
            >
              <Text style={styles.btnPayText}>{state.lang === 'en' ? 'Pay' : 'भुगतान करें'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{state.lang === 'en' ? 'Total Charged' : 'कुल शुल्क'}</Text>
            <Text style={styles.summaryValue}>₹{totalCharged.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{state.lang === 'en' ? 'Total Paid' : 'कुल भुगतान'}</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{state.lang === 'en' ? 'Ledger Entries' : 'खाता विवरण'}</Text>
        </View>

        <View style={styles.ledgerBlock}>
          {ledgerList.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="book-open" size={32} color="#A1A1AA" style={{ marginBottom: 12 }} />
              <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                {state.lang === 'en' ? 'No transactions.' : 'कोई लेनदेन नहीं मिला।'}
              </Text>
            </View>
          ) : (
            ledgerList.map((item, idx) => {
              const isNegative = item.amount < 0;
              const showBorder = idx !== ledgerList.length - 1;
              return (
                <View key={item.id} style={[styles.ledgerRow, showBorder && styles.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowAmount, { color: isNegative ? '#EF4444' : '#16A34A' }]}>{formatPrice(item.amount)}</Text>
                    <Text style={{ color: '#71717A', fontSize: 11 }}>{state.lang === 'en' ? 'Bal: ' : 'शेष: '}₹{Math.abs(item.balance).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
