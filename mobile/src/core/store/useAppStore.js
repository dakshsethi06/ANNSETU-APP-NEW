import { create } from 'zustand';

export const useAppStore = create((set) => ({
  networkConnected: true,
  toastVisible: false,
  toastMessage: '',
  toastType: 'info', // 'info' | 'success' | 'error'

  setNetworkConnected: (connected) => set({ networkConnected: connected }),
  showToast: (message, type = 'info') => set({
    toastMessage: message,
    toastType: type,
    toastVisible: true
  }),
  hideToast: () => set({ toastVisible: false })
}));
