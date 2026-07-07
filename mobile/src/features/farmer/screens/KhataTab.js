import React from 'react';
import { View, ScrollView, Modal, ActivityIndicator, Text } from 'react-native';
import { BACKEND_URL } from '../../../core/network/config';
import { useKhataPayment } from '../hooks/useKhataPayment';
import { useKhataDownloads } from '../hooks/useKhataDownloads';
import KhataSummaryView from '../components/KhataSummaryView';
import KhataVerificationView from '../components/KhataVerificationView';
import PaymentWebViewModal from '../modals/PaymentWebViewModal';
import DatePickerModal from '../modals/DatePickerModal';
import SuccessModal from '../modals/SuccessModal';
import { KhataHeader } from '../components/KhataHeader';
import { KhataBalanceCard } from '../components/KhataBalanceCard';
import { KhataPartialPayCard } from '../components/KhataPartialPayCard';
import { KhataSummaryRow } from '../components/KhataSummaryRow';
import { KhataLedgerBlock } from '../components/KhataLedgerBlock';
import { KhataTimelineModal } from '../components/KhataTimelineModal';
import { KhataDetailsView } from '../components/KhataDetailsView';
import { formatDate } from '../utils/khataHelpers';
import styles from '../styles/khataTabStyles';

export default function KhataTab({ farmerData, holdingsList = [], onPaymentSuccess, ledgerList = [], totalCharged = 0, totalPaid = 0 }) {
  const { state, handlers } = useKhataPayment(farmerData, holdingsList, onPaymentSuccess);
<<<<<<< Updated upstream
  const [pdfDownloading, setPdfDownloading] = React.useState(false);

  const handleDownloadStatementPdf = async () => {
    const farmerId = farmerData?.id || farmerData?.serial_number;
    if (!farmerId) {
      Alert.alert('Error', 'Farmer profile identifier not found.');
      return;
    }

    setPdfDownloading(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `Khata_Statement_${todayStr}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const url = `${BACKEND_URL}/api/farmers/${encodeURIComponent(farmerId)}/statement/download-pdf`;

      const downloadResult = await FileSystem.downloadAsync(url, fileUri);

      if (downloadResult.status === 200) {
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              type: 'application/pdf',
            });
            Alert.alert(
              state.lang === 'en' ? 'Success' : 'सफलता',
              state.lang === 'en' ? 'Statement downloaded successfully.' : 'विवरण सफलतापूर्वक डाउनलोड हो गया।'
            );
          } catch (intentErr) {
            console.warn('Intent launcher failed, falling back to Sharing:', intentErr.message);
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Khata Statement PDF',
              UTI: 'com.adobe.pdf'
            });
          }
        } else {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Khata Statement PDF',
            UTI: 'com.adobe.pdf'
          });
          Alert.alert(
            state.lang === 'en' ? 'Success' : 'सफलता',
            state.lang === 'en' ? 'Statement downloaded successfully.' : 'विवरण सफलतापूर्वक डाउनलोड हो गया।'
          );
        }
      } else {
        throw new Error(`Server returned status code ${downloadResult.status}`);
      }
    } catch (error) {
      console.warn('PDF statement download failed:', error.message);
      Alert.alert(
        state.lang === 'en' ? 'Download Failed' : 'डाउनलोड विफल',
        `${state.lang === 'en' ? 'Failed to download statement PDF.' : 'विवरण पीडीएफ डाउनलोड करने में विफल।'} Error: ${error.message}`,
        [
          { text: state.lang === 'en' ? 'Cancel' : 'रद्द करें', style: 'cancel' },
          { text: state.lang === 'en' ? 'Retry' : 'पुनः प्रयास करें', onPress: handleDownloadStatementPdf }
        ]
      );
    } finally {
      setPdfDownloading(false);
    }
  };

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

  const displayPaymentAmount = state.razorpayOrderData?.amount ?? (parseFloat(state.paymentAmount) || state.pendingRent);

  if (state.showSummary) {
    return (
      <View style={{ flex: 1 }}>
        <KhataSummaryView
          lang={state.lang}
          pendingRent={displayPaymentAmount}
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
            pendingRent={displayPaymentAmount}
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
=======
  const { pdfDownloading, receiptDownloading, handleConfirmTimeline } = useKhataDownloads(farmerData, state.lang);
  const [selectedEntry, setSelectedEntry] = React.useState(null);
  const [dateModalVisible, setDateModalVisible] = React.useState(false);
  const [fromDateStr, setFromDateStr] = React.useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [toDateStr, setToDateStr] = React.useState(new Date().toISOString().split('T')[0]);
  const [timelineOption, setTimelineOption] = React.useState('last_30_days');
  const [imageModalVisible, setImageModalVisible] = React.useState(false);
  const [fullImageUrl, setFullImageUrl] = React.useState('');
  const [imageLoading, setImageLoading] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  if (state.showVerificationForm) {
    return (
      <KhataVerificationView
        lang={state.lang} pendingRent={state.pendingRent} holdingsList={holdingsList}
        utrNumber={state.utrNumber} setUtrNumber={state.setUtrNumber}
        receiptFile={state.receiptFile} receiptFileName={state.receiptFileName} setReceiptFile={state.setReceiptFile} setReceiptFileName={state.setReceiptFileName}
        paymentDate={state.paymentDate} onUploadReceipt={handlers.handleUploadReceipt} onOpenDatePicker={() => state.setDatePickerVisible(true)}
        onSubmit={handlers.handleFormSubmit} onBackPress={() => state.setShowVerificationForm(false)}
      />
    );
  }
  if (state.showSummary) {
    const displayPaymentAmount = state.razorpayOrderData?.amount ?? (parseFloat(state.paymentAmount) || state.pendingRent);
    return (
      <KhataSummaryView
        lang={state.lang} pendingRent={displayPaymentAmount} farmerData={farmerData} holdingsList={holdingsList} formatDate={formatDate}
        onBackPress={() => state.setShowSummary(false)} onPayNow={handlers.handleOnlineCheckout}
        onAlreadyPaid={() => { state.setShowSummary(false); state.setShowVerificationForm(true); }}
      />
    );
  }
  if (selectedEntry) {
    return (
      <KhataDetailsView
        lang={state.lang} selectedEntry={selectedEntry} setSelectedEntry={setSelectedEntry} farmerData={farmerData} state={state} BACKEND_URL={BACKEND_URL}
        imageModalVisible={imageModalVisible} setImageModalVisible={setImageModalVisible} fullImageUrl={fullImageUrl} setFullImageUrl={setFullImageUrl}
        imageLoading={imageLoading} setImageLoading={setImageLoading} imageError={imageError} setImageError={setImageError} receiptDownloading={receiptDownloading}
      />
>>>>>>> Stashed changes
    );
  }
  return (
    <View style={styles.container}>
      <KhataHeader lang={state.lang} setLang={state.setLang} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <KhataBalanceCard lang={state.lang} pendingRent={state.pendingRent} setDateModalVisible={setDateModalVisible} handlePayPress={handlers.handlePayPress} />
        <KhataPartialPayCard lang={state.lang} pendingRent={state.pendingRent} paymentAmount={state.paymentAmount} setPaymentAmount={state.setPaymentAmount} handlePayPress={handlers.handlePayPress} />
        <KhataSummaryRow lang={state.lang} totalCharged={totalCharged} totalPaid={totalPaid} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{state.lang === 'en' ? 'Ledger Entries' : 'खाता विवरण'}</Text>
        </View>
        <KhataLedgerBlock lang={state.lang} ledgerList={ledgerList} farmerData={farmerData} setSelectedEntry={setSelectedEntry} />
      </ScrollView>
      <KhataTimelineModal
        lang={state.lang} visible={dateModalVisible} onClose={() => setDateModalVisible(false)}
        timelineOption={timelineOption} setTimelineOption={setTimelineOption}
        fromDateStr={fromDateStr} setFromDateStr={setFromDateStr} toDateStr={toDateStr} setToDateStr={setToDateStr}
        onConfirm={() => handleConfirmTimeline(timelineOption, fromDateStr, toDateStr, setDateModalVisible)}
      />
      <PaymentWebViewModal visible={!!state.paymentUrl} paymentUrl={state.paymentUrl} onClose={() => { state.setPaymentUrl(null); handlers.handleResetAll(); }} />
      <DatePickerModal visible={state.datePickerVisible} onClose={() => state.setDatePickerVisible(false)} onConfirm={handlers.handleConfirmDate} pickerDay={state.pickerDay} setPickerDay={state.setPickerDay} pickerMonth={state.pickerMonth} setPickerMonth={state.setPickerMonth} pickerYear={state.pickerYear} setPickerYear={state.setPickerYear} adjustDay={handlers.adjustDay} adjustMonth={handlers.adjustMonth} adjustYear={handlers.adjustYear} />
      <SuccessModal visible={state.verificationSuccessModalVisible} onClose={() => { state.setVerificationSuccessModalVisible(false); handlers.handleResetAll(); }} message={state.lang === 'en' ? 'Your payment verification request has been submitted successfully.' : 'आपका भुगतान सत्यापन अनुरोध सफलतापूर्वक जमा कर दिया गया है।'} title={state.lang === 'en' ? 'Request Submitted' : 'अनुरोध जमा किया गया'} />
      <Modal visible={pdfDownloading} transparent={true} animationType="none">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
            <ActivityIndicator size="large" color="#1E5C2E" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1B4332' }}>{state.lang === 'en' ? 'Generating PDF...' : 'पीडीएफ तैयार हो रहा है...'}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
