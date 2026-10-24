const API_BASE = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = API_BASE ? API_BASE.replace(/\/+$/, '') : '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('bloom_admin_token');

  const headers = {
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error?.message || 'API request failed');
      error.status = response.status;
      error.code = data.error?.code;
      error.details = data.error?.details;
      throw error;
    }

    return data;
  } catch (err) {
    if (!err.code) {
      err.code = 'ERR_NETWORK';
    }
    throw err;
  }
}
