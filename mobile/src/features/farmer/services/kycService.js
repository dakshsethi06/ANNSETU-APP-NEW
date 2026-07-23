import { BACKEND_URL } from '../../../core/network/config';

export async function initiateDigiLocker() {
  try {
    const { useAuthStore } = require('../../auth/store/useAuthStore');
    const token = useAuthStore.getState().session?.access_token;
    
    const response = await fetch(`${BACKEND_URL}/api/kyc/digilocker/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to initiate DigiLocker verification');
    }
    return data;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server.');
    }
    throw err;
  }
}

export async function checkDigiLockerStatus(verificationId) {
  try {
    const { useAuthStore } = require('../../auth/store/useAuthStore');
    const token = useAuthStore.getState().session?.access_token;

    const response = await fetch(`${BACKEND_URL}/api/kyc/digilocker/status/${encodeURIComponent(verificationId)}`, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch KYC verification status');
    }
    return data;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server.');
    }
    throw err;
  }
}

export async function verifyBankAccountSync(bankAccount, ifsc, name) {
  try {
    const { useAuthStore } = require('../../auth/store/useAuthStore');
    const token = useAuthStore.getState().session?.access_token;

    const response = await fetch(`${BACKEND_URL}/api/kyc/bank/verify-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ bankAccount, ifsc, name })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to verify bank account details');
    }
    return data;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server.');
    }
    throw err;
  }
}
