import { clientFetch } from '../../../core/network/client';

/**
 * Fetch list of all registered farmers
 */
export async function fetchFarmers() {
  return clientFetch('/api/farmer/list');
}

/**
 * Fetch ledger entries and transaction statements for a farmer
 */
export async function fetchFarmerLedger(farmerId) {
  return clientFetch(`/api/farmer/${farmerId}/ledger`);
}

/**
 * Fetch holdings info for a specific farmer
 */
export async function fetchFarmerHoldings(farmerId) {
  return clientFetch(`/api/farmer/${farmerId}/holdings`);
}

/**
 * Submit storage reservation/booking request
 */
export async function bookStorageSpace(bookingData) {
  return clientFetch('/api/storage/book', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}
