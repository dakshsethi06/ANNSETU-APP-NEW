import { useEffect, useState } from 'react';
import { supabase } from '../../../core/network/supabase';

/**
 * Hook to subscribe to real-time notification insertions for the logged-in user
 */
export function useNotifications(farmerId) {
  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!farmerId) return;

    setLoading(true);

    // Initialize Supabase realtime channel subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'AppNotification',
          filter: `userId=eq.${farmerId}`,
        },
        (payload) => {
          setNotificationsList((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    setLoading(false);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmerId]);

  return { notificationsList, setNotificationsList, loading };
}
