import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { s } from '../styles/SupportModal.styles';
import { COLORS, SPACING } from '../../../core/theme/theme';
import { fetchTicketConversations } from '../services/supportService';

// Helper mapping Freshdesk status IDs to text/colors
const getStatusLabel = (statusId) => {
  switch (statusId) {
    case 2: return { labelEn: 'Open', color: '#3B82F6', bg: '#EFF6FF' };
    case 3: return { labelEn: 'Pending', color: '#F59E0B', bg: '#FEF3C7' };
    case 4: return { labelEn: 'Resolved', color: '#10B981', bg: '#D1FAE5' };
    case 5: return { labelEn: 'Closed', color: '#6B7280', bg: '#F3F4F6' };
    default: return { labelEn: 'Open', color: '#3B82F6', bg: '#EFF6FF' };
  }
};

export default function TicketHistoryTab({ tickets, loadingTickets, onSelectTab }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [conversations, setConversations] = useState({}); // { [ticketId]: array of replies }
  const [loadingConversations, setLoadingConversations] = useState(false);

  const handleExpandTicket = async (id) => {
    if (selectedTicketId === id) {
      setSelectedTicketId(null);
      return;
    }

    setSelectedTicketId(id);

    // Fetch replies if we don't already have them for this ticket
    if (!conversations[id]) {
      setLoadingConversations(true);
      try {
        const replies = await fetchTicketConversations(id);
        const sortedReplies = (replies || []).sort((a, b) => {
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        });
        setConversations(prev => ({
          ...prev,
          [id]: sortedReplies
        }));
      } catch (err) {
        console.warn(`Failed to fetch conversations for ticket ${id}:`, err.message);
      } finally {
        setLoadingConversations(false);
      }
    }
  };

  if (loadingTickets) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.greenMid} />
        <Text style={s.loadingText}>Fetching history...</Text>
      </View>
    );
  }

  if (tickets.length === 0) {
    return (
      <View style={s.centerContainer}>
        <Feather name="clipboard" size={48} color={COLORS.textLight} style={{ marginBottom: 12 }} />
        <Text style={s.noTicketsTitle}>No Tickets Found</Text>
        <Text style={s.noTicketsSub}>You haven't submitted any support requests yet.</Text>
        
        <TouchableOpacity 
          style={[s.submitBtn, { paddingHorizontal: 30, marginTop: 24 }]} 
          onPress={() => onSelectTab('form')}
        >
          <Text style={s.submitBtnText}>Create New Ticket</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.historyContent} showsVerticalScrollIndicator={false}>
      <Text style={s.historyTitle}>Your Previous Support Tickets</Text>
      {tickets.map(ticket => {
        const isExpanded = selectedTicketId === ticket.id;
        const statusInfo = getStatusLabel(ticket.status);
        const ticketDate = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : 'N/A';

        return (
          <View key={ticket.id} style={s.ticketCard}>
            <TouchableOpacity
              style={s.ticketCardHeader}
              onPress={() => handleExpandTicket(ticket.id)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, marginRight: SPACING.sm }}>
                <View style={s.ticketIdRow}>
                  <Text style={s.ticketCardId}>Ticket #{ticket.id}</Text>
                  <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[s.statusBadgeText, { color: statusInfo.color }]}>
                      {statusInfo.labelEn}
                    </Text>
                  </View>
                </View>
                <Text style={s.ticketCardSubject}>{ticket.subject}</Text>
                <Text style={s.ticketCardMeta}>Created: {ticketDate} · {ticket.category || 'General'}</Text>
              </View>
              <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            {isExpanded && (
              <View style={s.ticketCardExpanded}>
                <View style={s.dividerLine} />
                
                {/* Original Description */}
                <Text style={s.expandedSectionTitle}>Your Query:</Text>
                <View style={s.originalDescriptionBox}>
                  <Text style={s.originalDescriptionText}>
                    {ticket.description ? ticket.description.replace(/<\/?[^>]+(>|$)/g, "") : 'No description provided.'}
                  </Text>
                </View>

                {/* Conversations / Agent Replies */}
                <Text style={s.expandedSectionTitle}>Conversation & Updates:</Text>
                {loadingConversations && !conversations[ticket.id] ? (
                  <ActivityIndicator size="small" color={COLORS.greenMid} style={{ padding: 12 }} />
                ) : !conversations[ticket.id] || conversations[ticket.id].length === 0 ? (
                  <Text style={s.noConversationsText}>
                    No updates from support agents yet. We will contact you soon!
                  </Text>
                ) : (
                  <View style={s.conversationsContainer}>
                    {conversations[ticket.id].map(reply => {
                      const cleanReplyText = reply.body_text || (reply.body ? reply.body.replace(/<\/?[^>]+(>|$)/g, "").trim() : '');
                      const replyDate = reply.created_at ? new Date(reply.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '';
                      
                      return (
                        <View
                          key={reply.id}
                          style={[
                            s.chatBubble,
                            reply.incoming ? s.chatBubbleUser : s.chatBubbleAgent
                          ]}
                        >
                          <Text style={s.chatBubbleSender}>
                            {reply.incoming ? 'You' : 'Annsetu Support'}
                          </Text>
                          <Text style={s.chatBubbleText}>{cleanReplyText}</Text>
                          {replyDate ? <Text style={s.chatBubbleTime}>{replyDate}</Text> : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
