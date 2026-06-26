import { BACKEND_URL } from './config';

/**
 * Fetches the list of farmers, optionally filtered by state and/or serial number.
 */
export async function fetchFarmers(state = '', serialNumber = '') {
  try {
    let url = `${BACKEND_URL}/api/farmers?`;
    if (state) url += `state=${encodeURIComponent(state)}&`;
    if (serialNumber) url += `serial_number=${encodeURIComponent(serialNumber)}&`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch farmers');
    }
    return data.farmers;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Registers a new farmer in the database.
 */
export async function addFarmer(farmerData) {
  try {
    const url = `${BACKEND_URL}/api/farmers`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(farmerData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add farmer');
    }
    return data.farmer;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Adds a new Amad lot to the database.
 */
export async function addAmad(amadData) {
  try {
    const url = `${BACKEND_URL}/api/amad`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(amadData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add Amad lot');
    }
    return data.lot;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Fetches cold storage holdings.
 */
export async function fetchHoldings() {
  try {
    const url = `${BACKEND_URL}/api/holdings`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch holdings');
    }
    return data.holdings;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Fetches notifications for a given farmer.
 */
export async function fetchNotifications(farmerId) {
  try {
    const url = `${BACKEND_URL}/api/notifications?farmerId=${encodeURIComponent(farmerId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch notifications');
    }
    return data.notifications;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

