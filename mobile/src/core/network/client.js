import { BACKEND_URL } from './config';

/**
 * Basic headers configuration for client requests
 */
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Core networking fetch request wrapper with global error interception
 */
export async function clientFetch(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Network response was not OK');
    }
    
    return data;
  } catch (error) {
    console.error(`[API Client Error] Fetch failed on ${endpoint}:`, error.message);
    throw error;
  }
}
