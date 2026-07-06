import { create } from 'zustand';

export const useFarmerStore = create((set) => ({
  selectedFarmerId: null,
  farmersList: [],
  holdingsList: [],
  ledgerData: null,
  
  setSelectedFarmerId: (id) => set({ selectedFarmerId: id }),
  setFarmersList: (list) => set({ farmersList: list }),
  setHoldingsList: (list) => set({ holdingsList: list }),
  setLedgerData: (data) => set({ ledgerData: data }),
  
  clearFarmerStore: () => set({
    selectedFarmerId: null,
    farmersList: [],
    holdingsList: [],
    ledgerData: null,
  }),
}));
