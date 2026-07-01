import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme';

export default function KhataTab({ farmerData, ledgerList = [] }) {
  const pendingRent = parseFloat(farmerData?.pendingRent || 0);

  // Compute total charged and total paid from live database records
  const totalCharged = ledgerList.reduce((sum, item) => item.amount < 0 ? sum + Math.abs(item.amount) : sum, 0);
  const totalPaid = ledgerList.reduce((sum, item) => item.amount > 0 ? sum + item.amount : sum, 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-IN', options);
    } catch (e) {
      return dateStr;
    }
  };

  const formatPrice = (val) => {
    const isNegative = val < 0;
    const sign = isNegative ? '-' : '+';
    const formatted = Math.abs(val).toLocaleString('en-IN');
    return `${sign}₹${formatted}`;
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={styles.screenHeader}>
        <Text style={styles.logoText}>Annsetu</Text>
        <TouchableOpacity style={styles.searchHeaderIcon} onPress={() => Alert.alert('Search', 'Khata search is active.')}>
          <Feather name="search" size={20} color="#1B4332" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── Net Balance Red Gradient Card ─── */}
        <LinearGradient 
          colors={['#EF4444', '#DC2626']} 
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>Net Balance / शेष राशि</Text>
          <Text style={styles.balanceAmount}>
            ₹{pendingRent.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.balanceSub}>Dues Pending / देनदारी बाकी</Text>

          {/* Buttons inside Red Card */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity 
              style={styles.btnStatement} 
              activeOpacity={0.8}
              onPress={() => Alert.alert('Download Statement', 'Downloading PDF statement...')}
            >
              <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnStatementText}>Statement</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.btnPayNow} 
              activeOpacity={0.9}
              onPress={() => Alert.alert('Pay Now', 'Redirecting to payment gateway...')}
            >
              <Text style={styles.btnPayNowText}>Pay Now / भुगतान करें</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ─── Total Charged & Paid Small Cards ─── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Charged</Text>
            <Text style={styles.summaryValue}>₹{totalCharged.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* ─── Ledger Entries Section Header ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Ledger Entries / खाता विवरण</Text>
          <TouchableOpacity style={styles.filterLink} activeOpacity={0.7}>
            <Text style={styles.filterLinkText}>Filter {'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Ledger List Card Block ─── */}
        <View style={styles.ledgerBlock}>
          {ledgerList.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="book-open" size={32} color="#A1A1AA" style={{ marginBottom: 12 }} />
              <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 16 }}>
                No ledger transactions found in the database for this farmer.
              </Text>
            </View>
          ) : (
            ledgerList.map((item, idx) => {
              const isNegative = item.amount < 0;
              const showBorder = idx !== ledgerList.length - 1;

              return (
                <View key={item.id} style={[styles.ledgerRow, showBorder && styles.rowBorder]}>
                  {/* Left Side: Title and Date */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                  </View>

                  {/* Right Side: Amount and Running Balance */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowAmount, { color: isNegative ? '#EF4444' : '#16A34A' }]}>
                      {formatPrice(item.amount)}
                    </Text>
                    <Text style={[styles.rowBalance, { color: '#71717A' }]}>
                      Bal: ₹{Math.abs(item.balance).toLocaleString('en-IN')}
                    </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0CE',
    backgroundColor: '#FAF7F0',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B4332',
  },
  searchHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAE7D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Red Balance Gradient Card
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.md,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#FEE2E2',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  balanceSub: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 4,
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  btnStatement: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnStatementText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnPayNow: {
    flex: 1.2,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  btnPayNowText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '800',
  },

  // Total Charged & Paid Small Cards Row
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '850',
    color: '#1A1A1A',
    marginTop: 6,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B4332',
  },
  filterLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777777',
  },

  // Ledger List Cards Block
  ledgerBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE3',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '750',
    color: '#1A1A1A',
  },
  rowDate: {
    fontSize: 11,
    color: '#777777',
    marginTop: 3,
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowBalance: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});
