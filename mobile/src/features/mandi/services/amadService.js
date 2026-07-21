import { BACKEND_URL } from '../../../core/network/config';

export async function addAmad(amadData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/amad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(amadData),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to add Amad lot');
    return data.lot;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}

export async function fetchHoldings() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/holdings?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch holdings');
    return data.holdings;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}
