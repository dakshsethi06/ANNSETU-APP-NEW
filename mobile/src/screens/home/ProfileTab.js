import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../../theme';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export default function ProfileTab({ farmerData, onBackPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile / मेरा प्रोफाइल</Text>
      <Text style={styles.subtitle}>Farmer registration details</Text>

      {/* Profile Details Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={{ fontSize: 36 }}>👨‍🌾</Text>
        </View>

        <Text style={styles.farmerName}>{farmerData?.name || 'Farmer Name'}</Text>
        <Text style={styles.farmerSub}>CS Account: CS-{farmerData?.serial_number}</Text>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Father's Name</Text>
            <Text style={styles.detailValue}>{farmerData?.fatherName || '-'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile Phone</Text>
            <Text style={styles.detailValue}>{farmerData?.phone || '-'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Village / Address</Text>
            <Text style={styles.detailValue}>
              {farmerData?.village ? `${farmerData.village}, ` : ''}
              {farmerData?.district || 'Firozabad'}, {farmerData?.state || 'UP'}
            </Text>
          </View>
        </View>
      </View>

      {/* Switch Profile Button */}
      {onBackPress ? (
        <TouchableOpacity style={styles.switchProfileBtn} onPress={onBackPress} activeOpacity={0.8}>
          <Feather name="users" size={16} color="#1B4332" style={{ marginRight: 8 }} />
          <Text style={styles.switchProfileText}>Switch Farmer Profile</Text>
        </TouchableOpacity>
      ) : null}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()} activeOpacity={0.8}>
        <Feather name="log-out" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Sign Out from App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FAF7F0',
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B4332',
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    marginBottom: 24,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.md,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF5E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EAD9B0',
    marginBottom: 16,
  },
  farmerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B4332',
  },
  farmerSub: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    fontWeight: '600',
  },
  detailsGrid: {
    width: '100%',
    marginTop: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFE3',
  },
  switchProfileBtn: {
    flexDirection: 'row',
    backgroundColor: '#EAE7D6',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  switchProfileText: {
    fontSize: 13,
    fontWeight: '750',
    color: '#1B4332',
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '750',
    color: '#FFFFFF',
  },
});
