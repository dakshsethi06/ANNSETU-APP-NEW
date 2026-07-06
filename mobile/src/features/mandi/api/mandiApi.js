import { clientFetch } from '../../../core/network/client';

/**
 * Fetch Mandi rates filtering by state, commodity, and market location
 */
export async function fetchMandiRates(state, commodity, market) {
  const query = `state=${encodeURIComponent(state || '')}&commodity=${encodeURIComponent(commodity || '')}&market=${encodeURIComponent(market || '')}`;
  return clientFetch(`/api/mandi/rates?${query}`);
}

/**
 * Fetch Amad arrival lists
 */
export async function fetchAmadList() {
  return clientFetch('/api/amad/list');
}
