import React from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { BACKEND_URL } from '../../../core/network/config';

export function useKhataDownloads(farmerData, lang) {
  const [pdfDownloading, setPdfDownloading] = React.useState(false);
  const [receiptDownloading, setReceiptDownloading] = React.useState(false);

  const handleDownloadStatementPdf = async (fromDate, toDate) => {
    const farmerId = farmerData?.id || farmerData?.serial_number;
    if (!farmerId) return Alert.alert('Error', 'Farmer profile identifier not found.');

    setPdfDownloading(true);
    try {
      const filename = `Khata_Statement_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const url = `${BACKEND_URL}/api/farmers/${encodeURIComponent(farmerId)}/statement/download-pdf?fromDate=${fromDate}&toDate=${toDate}`;

      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      if (downloadResult.status !== 200) throw new Error(`Status ${downloadResult.status}`);

      await handleFileView(downloadResult.uri, 'Statement downloaded successfully.', 'विवरण सफलतापूर्वक डाउनलोड हो गया।');
    } catch (error) {
      Alert.alert(lang === 'en' ? 'Download Failed' : 'डाउनलोड विफल', error.message);
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleConfirmTimeline = async (timelineOption, fromDateStr, toDateStr, setDateModalVisible) => {
    let fromDate = '';
    let toDate = '';
    const now = new Date();
    const formatDateLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    toDate = formatDateLocal(now);

    if (timelineOption === 'last_7_days') fromDate = formatDateLocal(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    else if (timelineOption === 'last_30_days') fromDate = formatDateLocal(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    else if (timelineOption === 'last_3_months') { const p = new Date(); p.setMonth(now.getMonth() - 3); fromDate = formatDateLocal(p); }
    else if (timelineOption === 'last_6_months') { const p = new Date(); p.setMonth(now.getMonth() - 6); fromDate = formatDateLocal(p); }
    else if (timelineOption === 'last_1_year') { const p = new Date(); p.setFullYear(now.getFullYear() - 1); fromDate = formatDateLocal(p); }
    else if (timelineOption === 'custom') { fromDate = fromDateStr; toDate = toDateStr; }

    setDateModalVisible(false);
    await handleDownloadStatementPdf(fromDate, toDate);
  };

  const handleFileView = async (uri, successEn, successHi) => {
    if (Platform.OS === 'android') {
      try {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: 'application/pdf' });
        Alert.alert(lang === 'en' ? 'Success' : 'सफलता', lang === 'en' ? successEn : successHi);
      } catch (err) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'PDF Document', UTI: 'com.adobe.pdf' });
      }
    } else {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'PDF Document', UTI: 'com.adobe.pdf' });
      Alert.alert(lang === 'en' ? 'Success' : 'सफलता', lang === 'en' ? successEn : successHi);
    }
  };

  return {
    pdfDownloading,
    receiptDownloading,
    handleConfirmTimeline
  };
}
