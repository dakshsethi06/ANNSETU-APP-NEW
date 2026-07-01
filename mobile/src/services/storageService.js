import { BACKEND_URL } from './config';

/**
 * Fetches cold storage summary metrics and recent activity.
 */
export async function fetchColdStorageSummary(coldStorageId = 'cmmp9txv0000ai3t4wush9trs') {
  try {
    const url = `${BACKEND_URL}/api/cold-storage/summary?coldStorageId=${encodeURIComponent(coldStorageId)}&t=${Date.now()}`;
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch cold storage summary');
    }
    return data.summary;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Fetches the list of all registered cold storages.
 */
export async function fetchColdStorages() {
  try {
    const url = `${BACKEND_URL}/api/cold-storages?t=${Date.now()}`;
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch cold storages');
    }
    return data.coldStorages;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Registers a new cold storage in the database.
 */
export async function addColdStorage(csData) {
  try {
    const url = `${BACKEND_URL}/api/cold-storages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(csData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add cold storage');
    }
    return data.coldStorage;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}
