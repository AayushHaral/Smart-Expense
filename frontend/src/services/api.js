import axios from 'axios';

let rawBaseURL = import.meta.env.VITE_API_URL;
if (!rawBaseURL || rawBaseURL.trim() === '') {
  if (import.meta.env.PROD) {
    rawBaseURL = '/api';
  } else {
    // Dynamic host resolution: allows mobile devices on same Wi-Fi network to reach host PC backend on port 5000
    const currentHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    rawBaseURL = `http://${currentHost}:5000/api`;
  }
}
rawBaseURL = rawBaseURL.trim().replace(/\/+$/, '');
if (!rawBaseURL.endsWith('/api')) {
  rawBaseURL += '/api';
}

const API = axios.create({
  baseURL: rawBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to append JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authorization and network failures
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid token if unauthorized
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=1';
      }
    } else if (!error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      error.message = 'Backend server unreachable. Please verify that your backend server is running and accessible.';
    }
    return Promise.reject(error);
  }
);


export default API;

