import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
  onAlreadyPaid,
  voucherCode,
  voucherError,
  discountAmount = 0,
  netAmount,
  isApplying,
  onApplyVoucher,
  onResetVoucher,
  onRedeemFullVoucher
}) {
  const { t } = useTranslation();
  const [localCode, setLocalCode] = React.useState(voucherCode || '');

  React.useEffect(() => {
    setLocalCode(voucherCode || '');
  }, [voucherCode]);
  const holding = holdingsList && holdingsList.length > 0 ? holdingsList[0] : null;
  const csName = holding?.cold_storage || 'Annsetu Storage Center';
  const bookingId = holding?.lot_id || 'BK-99210';
  const commodity = holding?.crop || farmerData?.commodity || 'Potato';
  const quantity = holding?.bags
    ? `${holding.bags} ${holding.bags === 1 ? t('khata.bags_unit_one') : t('khata.bags_unit_other')}`
    : `350 ${t('khata.bags_unit_other')}`;

  const formatDateRangeAndDuration = (dateStr) => {
    if (!dateStr) return '';
    try {
      const amadDateObj = new Date(dateStr);
      const today = new Date();
      const diffTime = Math.abs(today - amadDateObj);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const formattedAmad = formatDate(amadDateObj, lang);
      const formattedToday = formatDate(today, lang);

      const daysUnit = diffDays === 1 ? t('khata.days_unit_one') : t('khata.days_unit_other');
      return `${formattedAmad} - ${formattedToday} (${diffDays} ${daysUnit})`;
    } catch (e) {
      return dateStr;
    }
  };

  const storageDuration = holding?.amadDate
    ? formatDateRangeAndDuration(holding.amadDate)
    : `${formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), lang)} - ${formatDate(new Date(), lang)} (30 ${t('khata.days_unit_other')})`;

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
          <Text style={styles.backLinkText}>{t('khata.back_to_khata')}</Text>
        </TouchableOpacity>

        <Text style={styles.summaryPageTitle}>{t('khata.payment_summary')}</Text>

        <View style={styles.summaryDetailsCard}>
          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{t('khata.cold_storage')}</Text>
            <Text style={styles.detailValue}>{csName}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{t('khata.booking_id')}</Text>
            <Text style={styles.detailValue}>{bookingId}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{t('khata.commodity')}</Text>
            <Text style={styles.detailValue}>{commodity}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{t('khata.quantity')}</Text>
            <Text style={styles.detailValue}>{quantity}</Text>
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{t('khata.storage_duration')}</Text>
            <Text style={styles.detailValue}>{storageDuration}</Text>
          </View>

          <View style={{ borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#4B5563', marginBottom: 8 }}>
              {lang === 'en' ? 'Have a Promo Voucher?' : 'प्रोमो वाउचर है?'}
            </Text>
            {!voucherCode ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      fontSize: 14,
                      backgroundColor: '#F9FAFB',
                      color: '#1F2937'
                    }}
                    placeholder={lang === 'en' ? 'Enter voucher code' : 'वाउचर कोड दर्ज करें'}
                    placeholderTextColor="#9CA3AF"
                    value={localCode}
                    onChangeText={setLocalCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={{
                      marginLeft: 8,
                      backgroundColor: '#2D6A4F',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 6,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => onApplyVoucher(localCode)}
                    disabled={isApplying}
                  >
                    {isApplying ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                        {lang === 'en' ? 'Apply' : 'लागू करें'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {voucherError && (
                  <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>
                    {voucherError}
                  </Text>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="check-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#065F46', fontWeight: '600', fontSize: 13 }}>
                    {voucherCode} {lang === 'en' ? 'Applied' : 'लागू किया गया'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onResetVoucher}>
                  <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 13 }}>
                    {lang === 'en' ? 'Remove' : 'हटाएं'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.summaryDetailItem}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Subtotal Amount' : 'कुल राशि'}</Text>
            <Text style={styles.detailValue}>
              ₹{Number(pendingRent || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.summaryDetailItem}>
              <Text style={styles.detailLabel}>{lang === 'en' ? 'Discount Applied' : 'छूट लागू की गई'}</Text>
              <Text style={[styles.detailValue, { color: '#059669' }]}>
                -₹{Number(discountAmount).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={[styles.summaryDetailItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>{lang === 'en' ? 'Net Payable Amount' : 'देय राशि'}</Text>
            <Text style={[styles.detailValue, { color: '#DC2626', fontWeight: 'bold', fontSize: 16 }]}>
              ₹{Number(netAmount !== null ? netAmount : pendingRent).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.8}
          onPress={netAmount === 0 ? onRedeemFullVoucher : onPayNow}
          disabled={isApplying}
        >
          <Text style={styles.doneBtnText}>
            {netAmount === 0 
              ? (lang === 'en' ? 'Redeem Voucher' : 'वाउचर भुनाएं') 
              : t('khata.pay_now')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.alreadyPaidBtn}
          activeOpacity={0.8}
          onPress={onAlreadyPaid}
        >
          <Text style={styles.alreadyPaidBtnText}>
            {t('khata.already_paid')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
