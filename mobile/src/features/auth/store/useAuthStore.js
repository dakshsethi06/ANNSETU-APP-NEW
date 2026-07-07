import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../core/network/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      session: null,
      role: 'Farmer', // Default role
      loadingSession: true,
      showRoleSwitcher: false,
      isKeyboardVisible: false,
      hidePreviewFromLogin: false,

      setSession: (session) => set({ session }),
      setRole: (role) => set({ role }),
      setLoadingSession: (loadingSession) => set({ loadingSession }),
      setShowRoleSwitcher: (showRoleSwitcher) => set({ showRoleSwitcher }),
      setKeyboardVisible: (isKeyboardVisible) => set({ isKeyboardVisible }),
      setHidePreviewFromLogin: (hidePreviewFromLogin) => set({ hidePreviewFromLogin }),

      determineRole: async (phone) => {
        if (!phone) return;
        try {
          const savedRole = await AsyncStorage.getItem('user_role');
          if (savedRole) {
            set({ role: savedRole });
            return;
          }
          const { fetchUserRole } = require('../../farmer/services/farmerService');
          const detectedRole = await fetchUserRole(phone);
          set({ role: detectedRole });
        } catch (e) {
          console.warn('Error determining role:', e);
          set({ role: 'ColdStorage' });
        }
      },

      loginSuccess: async (phone, registrationRole) => {
        const sessionObj = { user: { phone: '+91' + phone } };
        set({ session: sessionObj });
        
        let resolvedRole = 'ColdStorage';
        if (registrationRole === 'coldstorage' || registrationRole === 'ColdStorageFacility') {
          resolvedRole = 'ColdStorageFacility';
        } else if (registrationRole === 'vendor' || registrationRole === 'Vendor') {
          resolvedRole = 'Vendor';
        } else if (registrationRole === 'farmer' || registrationRole === 'ColdStorage') {
          resolvedRole = 'ColdStorage';
        } else {
          try {
            const { fetchUserRole } = require('../../farmer/services/farmerService');
            resolvedRole = await fetchUserRole('+91' + phone);
          } catch (e) {
            resolvedRole = 'ColdStorage';
          }
        }
        set({ role: resolvedRole });
        try {
          await AsyncStorage.setItem('user_role', resolvedRole);
        } catch (err) {
          console.warn('Failed to save user role to AsyncStorage:', err);
        }
      },

      logout: async () => {
        supabase.auth.signOut();
        set({ session: null, role: 'Farmer', showRoleSwitcher: false });
        try {
          await AsyncStorage.removeItem('user_role');
        } catch (err) {
          console.warn('Failed to clear user role from AsyncStorage:', err);
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session, role: state.role }), // Only persist session & role
    }
  )
);
