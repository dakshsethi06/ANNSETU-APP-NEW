import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tbrvuyzjzruysxamiuaz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicnZ1eXpqenJ1eXN4YW1pdWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODczNTAsImV4cCI6MjA5Nzk2MzM1MH0.vs9F0doRCPhI6rPGfURJYak05FbFMhZ1jhmN64m7NXY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
