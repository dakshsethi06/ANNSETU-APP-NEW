import { BACKEND_URL } from '../../../core/network/config';

export async function fetchFarmers(state = '', serialNumber = '') {
  try {
    let url = `${BACKEND_URL}/api/farmers?`;
    if (state) url += `state=${encodeURIComponent(state)}&`;
    if (serialNumber) url += `serial_number=${encodeURIComponent(serialNumber)}&`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch farmers');
    return data.farmers;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}

export async function addFarmer(farmerData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/farmers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(farmerData),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to add farmer');
    return data.farmer;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}

export async function fetchFarmerLedger(farmerId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/farmers/${encodeURIComponent(farmerId)}/ledger`);
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch ledger');
    return data.ledger;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}

export async function fetchUserRole(phone) {
  try {
    const url = `${BACKEND_URL}/api/user-role?phone=${encodeURIComponent(phone)}&t=${Date.now()}`;
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to check user role');
    return data.role;
  } catch (err) {
    console.warn('fetchUserRole failed:', err.message);
    return 'ColdStorage'; // fallback
  }
}
