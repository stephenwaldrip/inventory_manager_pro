import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A token can expire or be revoked mid-session. Without this every subsequent
// page just fails silently while the app still looks signed in.
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // /auth/* answers 401 for bad credentials on a form the user is already
    // looking at — redirecting there would discard the message they need.
    const isAuthAttempt = url.startsWith('/auth/');

    if (status === 401 && !isAuthAttempt && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default instance;