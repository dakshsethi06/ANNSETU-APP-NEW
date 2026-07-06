import React, { useState, useEffect } from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { s } from '../styles/SupportModal.styles';
import { COLORS } from '../../../core/theme/theme';
import { fetchSupportTickets } from '../services/supportService';
import NewTicketTab from '../components/NewTicketTab';
import TicketHistoryTab from '../components/TicketHistoryTab';

export default function SupportModal({ visible, onClose, userName, userPhone, userRole }) {
  // Navigation tabs: 'form' | 'history'
  const [activeTab, setActiveTab] = useState('form');

  // Ticket History states
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const handleClose = () => {
    setActiveTab('form');
    onClose();
  };

  const loadTickets = async () => {
    if (!userPhone) return;
    setLoadingTickets(true);
    try {
      const fetched = await fetchSupportTickets(userPhone);
      const sorted = (fetched || []).sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      setTickets(sorted);
    } catch (err) {
      console.warn('Failed to load tickets:', err.message);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch history when tab changes to history, or modal becomes visible
  useEffect(() => {
    if (visible && activeTab === 'history') {
      loadTickets();
    }
  }, [activeTab, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={s.safeArea}>
        {/* Header bar */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <Feather name="arrow-left" size={24} color={COLORS.greenDeep} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Help & Support / सहायता</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Selector */}
        <View style={s.tabsContainer}>
          <TouchableOpacity
            style={[s.tabButton, activeTab === 'form' && s.tabButtonActive]}
            onPress={() => setActiveTab('form')}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={16} color={activeTab === 'form' ? COLORS.white : COLORS.greenMid} style={{ marginRight: 6 }} />
            <Text style={[s.tabButtonText, activeTab === 'form' && s.tabButtonTextActive]}>
              New Ticket
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabButton, activeTab === 'history' && s.tabButtonActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Feather name="list" size={16} color={activeTab === 'history' ? COLORS.white : COLORS.greenMid} style={{ marginRight: 6 }} />
            <Text style={[s.tabButtonText, activeTab === 'history' && s.tabButtonTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Views */}
        {activeTab === 'form' ? (
          <NewTicketTab
            userName={userName}
            userPhone={userPhone}
            userRole={userRole}
            onClose={handleClose}
            onRefreshHistory={loadTickets}
          />
        ) : (
          <TicketHistoryTab
            tickets={tickets}
            loadingTickets={loadingTickets}
            onSelectTab={setActiveTab}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
