import { BACKEND_URL } from '../../../core/network/config';
import { useAuthStore } from '../../auth/store/useAuthStore';

export async function fetchFarmers(state = '', serialNumber = '') {
  try {
    let url = `${BACKEND_URL}/api/farmers?t=${Date.now()}&`;
    if (state) url += `state=${encodeURIComponent(state)}&`;
    if (serialNumber) url += `serial_number=${encodeURIComponent(serialNumber)}&`;
    
    const token = useAuthStore.getState().session?.access_token;
    const response = await fetch(url, {
      headers: { 
        'Cache-Control': 'no-cache',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
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
    const token = useAuthStore.getState().session?.access_token;
    const response = await fetch(`${BACKEND_URL}/api/farmers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
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
    const token = useAuthStore.getState().session?.access_token;
    const response = await fetch(`${BACKEND_URL}/api/farmers/${encodeURIComponent(farmerId)}/ledger?t=${Date.now()}`, {
      headers: { 
        'Cache-Control': 'no-cache',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
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

export async function updateFarmerProfile(farmerId, updateData) {
  try {
    const token = useAuthStore.getState().session?.access_token;
    const response = await fetch(`${BACKEND_URL}/api/farmers/${encodeURIComponent(farmerId)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(updateData),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to update farmer profile');
    return data.farmer;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}

export async function sendProfileVerificationOtp(farmerId, targetType, targetValue) {
  try {
    const token = useAuthStore.getState().session?.access_token;
    const response = await fetch(`${BACKEND_URL}/api/otp/send-verification`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ id: farmerId, targetType, targetValue }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to send verification OTP');
    return data;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}

export async function verifyAndUpdateFarmerProfile(farmerId, targetType, targetValue, otpCode, updateData) {
  try {
    const token = useAuthStore.getState().session?.access_token;
    const response = await fetch(`${BACKEND_URL}/api/otp/verify-and-update`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ id: farmerId, targetType, targetValue, otpCode, name: updateData.name }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to verify OTP and update profile');
    return data.farmer;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}
