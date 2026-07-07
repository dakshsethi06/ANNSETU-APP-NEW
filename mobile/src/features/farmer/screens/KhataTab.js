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
