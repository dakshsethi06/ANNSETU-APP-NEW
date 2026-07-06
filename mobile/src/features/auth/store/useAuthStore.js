import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create(
  persist(
    (set) => ({
      session: null,
      role: 'unauthenticated', // 'Farmer' | 'Vendor' | 'ColdStorageFacility' | 'unauthenticated'
      userName: '',
      userPhone: '',
      
      setSession: (session) => set({ session }),
      setRole: (role) => set({ role }),
      setUserInfo: (name, phone) => set({ userName: name, userPhone: phone }),
      
      logout: () => set({ 
        session: null, 
        role: 'unauthenticated',
        userName: '',
        userPhone: ''
      }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
