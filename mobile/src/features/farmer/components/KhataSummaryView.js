import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import styles from '../styles/khataTabStyles';

export default function KhataSummaryView({
  lang,
  pendingRent,
  farmerData,
  holdingsList = [],
  formatDate,
  onBackPress,
  onPayNow,
  onAlreadyPaid
}) {
  const holding = holdingsList && holdingsList.length > 0 ? holdingsList[0] : null;
  const csName = holding?.cold_storage || 'Annsetu Storage Center';
  const bookingId = holding?.lot_id || 'BK-99210';
  const commodity = holding?.crop || farmerData?.commodity || 'Potato';
  const quantity = holding?.bags
    ? `${holding.bags} ${lang === 'en' ? 'Bags' : 'बोरी'}`
    : `350 ${lang === 'en' ? 'Bags' : 'बोरी'}`;

  const formatDateRangeAndDuration = (dateStr) => {
    if (!dateStr) return '';
    try {
      const amadDateObj = new Date(dateStr);
      const today = new Date();
      const diffTime = Math.abs(today - amadDateObj);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      const formattedAmad = amadDateObj.toLocaleDateString('en-IN', options);
      const formattedToday = today.toLocaleDateString('en-IN', options);

      return `${formattedAmad} - ${formattedToday} (${diffDays} ${lang === 'en' ? 'days' : 'दिन'})`;
    } catch (e) {
      return dateStr;
    }
  };

  const storageDuration = holding?.amadDate
    ? formatDateRangeAndDuration(holding.amadDate)
    : `${formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))} - ${formatDate(new Date())} (30 ${lang === 'en' ? 'days' : 'दिन'})`;

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.brandTitle}>Annsetu</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back button link */}
        <TouchableOpacity
          style={styles.backLinkRow}
          activeOpacity={0.7}
          onPress={onBackPress}
        >
          <Feather name="arrow-left" size={16} color="#2D6A4F" style={{ marginRight: 6 }} />
          <Text style={styles.backLinkText}>{lang === 'en' ? 'Back to Khata' : 'खाता पर वापस जाएं'}</Text>
        </TouchableOpacity>

        <Text style={styles.summaryPageTitle}>{lang === 'en' ? 'Payment Summary' : 'भुगतान सारांश'}</Text>

        <View style={styles.summaryDetailsCard}>
          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Cold Storage' : 'कोल्ड स्टोरेज'}</Text>
            <Text style={styles.detailValue}>{csName}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Booking ID' : 'बुकिंग आईडी'}</Text>
            <Text style={styles.detailValue}>{bookingId}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Commodity' : 'फसल'}</Text>
            <Text style={styles.detailValue}>{commodity}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Quantity' : 'मात्रा'}</Text>
            <Text style={styles.detailValue}>{quantity}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Storage Duration' : 'भंडारण अवधि'}</Text>
            <Text style={styles.detailValue}>{storageDuration}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Payment Amount' : 'भुगतान राशि'}</Text>
            <Text style={[styles.detailValue, { color: '#DC2626' }]}>
              ₹{pendingRent.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={[styles.summaryDetailItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Payment Status' : 'भुगतान की स्थिति'}</Text>
            <View style={styles.statusBadgeContainer}>
              <Feather name="clock" size={13} color="#B45309" style={{ marginRight: 6 }} />
              <Text style={styles.statusBadgeText}>
                {lang === 'en' ? 'Pending Verification' : 'सत्यापन लंबित'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.8}
          onPress={onPayNow}
        >
          <Text style={styles.doneBtnText}>
            {lang === 'en' ? 'Pay Now' : 'अभी भुगतान करें'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.alreadyPaidBtn}
          activeOpacity={0.8}
          onPress={onAlreadyPaid}
        >
          <Text style={styles.alreadyPaidBtnText}>
            {lang === 'en' ? 'Already Paid' : 'पहले ही भुगतान कर दिया'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
