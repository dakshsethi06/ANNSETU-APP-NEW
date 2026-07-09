import React, { useState, useEffect, useCallback } from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { s } from '../styles/SupportModal.styles';
import { COLORS } from '../../../core/theme/theme';
import NewTicketTab from '../components/NewTicketTab';
import TicketHistoryTab from '../components/TicketHistoryTab';
import LiveChatTab from '../components/LiveChatTab';
import { fetchSupportTickets } from '../services/supportService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function SupportModal({ visible, onClose, userName, userPhone, userRole }) {
  const [activeTab, setActiveTab] = useState('new');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Check for active open support session when modal opens
  useEffect(() => {
    if (visible && userPhone) {
      fetch(`${BACKEND_URL}/api/support/chat/active?phone=${encodeURIComponent(userPhone)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.active) {
            setActiveTab('chat');
          } else {
            setActiveTab('new');
          }
        })
        .catch(err => {
          console.warn('[SupportModal] Active check error:', err.message);
          setActiveTab('new');
        });
    }
  }, [visible, userPhone]);

  // Load tickets when history tab is active or refreshed
  useEffect(() => {
    const loadTickets = async () => {
      if (!userPhone || activeTab !== 'history') return;
      setLoadingTickets(true);
      try {
        const fetchedTickets = await fetchSupportTickets(userPhone);
        const filteredTickets = (fetchedTickets || []).filter(t => {
          const subject = (t.subject || '').toLowerCase();
          const category = (t.category || '').toLowerCase();
          const channel = (t.channel || '').toLowerCase();
          
          const isLiveChat = 
            category === 'live chat' || 
            channel === 'chat' || 
            subject.startsWith('stock & lot query') ||
            subject.startsWith('payment & rent query') ||
            subject.startsWith('mpin & login issue') ||
            subject.startsWith('talk to live agent') ||
            subject.includes('live chat');

          return !isLiveChat;
        });
        setTickets(filteredTickets);
      } catch (err) {
        console.warn('[SupportModal] Load tickets error:', err.message);
      } finally {
        setLoadingTickets(false);
      }
    };
    loadTickets();
  }, [activeTab, userPhone, historyRefreshKey]);

  const handleClose = () => {
    if (activeTab !== 'new') {
      setActiveTab('new');
    } else {
      onClose();
    }
  };

  const handleRefreshHistory = useCallback(() => {
    setHistoryRefreshKey(prev => prev + 1);
  }, []);

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
          <Text style={s.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Selector */}
        <View style={s.tabsContainer}>
          <TouchableOpacity
            style={[s.tabButton, activeTab === 'new' && s.tabButtonActive]}
            onPress={() => setActiveTab('new')}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={14} color={activeTab === 'new' ? COLORS.white : COLORS.greenMid} style={{ marginRight: 4 }} />
            <Text style={[s.tabButtonText, activeTab === 'new' && s.tabButtonTextActive]}>
              New Ticket
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabButton, activeTab === 'history' && s.tabButtonActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Feather name="list" size={14} color={activeTab === 'history' ? COLORS.white : COLORS.greenMid} style={{ marginRight: 4 }} />
            <Text style={[s.tabButtonText, activeTab === 'history' && s.tabButtonTextActive]}>
              My Tickets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabButton, activeTab === 'chat' && s.tabButtonActive]}
            onPress={() => setActiveTab('chat')}
            activeOpacity={0.8}
          >
            <Feather name="message-circle" size={14} color={activeTab === 'chat' ? COLORS.white : COLORS.greenMid} style={{ marginRight: 4 }} />
            <Text style={[s.tabButtonText, activeTab === 'chat' && s.tabButtonTextActive]}>
              Live Chat
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'new' && (
          <NewTicketTab
            userName={userName}
            userPhone={userPhone}
            userRole={userRole}
            onClose={handleClose}
            onRefreshHistory={handleRefreshHistory}
          />
        )}
        {activeTab === 'history' && (
          <TicketHistoryTab
            key={historyRefreshKey}
            tickets={tickets}
            loadingTickets={loadingTickets}
            onSelectTab={setActiveTab}
            userName={userName}
          />
        )}
        {activeTab === 'chat' && (
          <LiveChatTab userName={userName} userPhone={userPhone} />
        )}
      </SafeAreaView>
    </Modal>
  );
}
