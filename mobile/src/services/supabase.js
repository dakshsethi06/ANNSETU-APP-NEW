import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nbczrugpgjzjktoivfrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iY3pydWdwZ2p6amt0b2l2ZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjA0OTcsImV4cCI6MjA5NzkzNjQ5N30.n-ASqt_GnQmVd-0fv1JZuQsdO4BrpaI3ePcEIAfv3Tk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
