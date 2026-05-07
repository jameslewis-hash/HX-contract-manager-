import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_URL || '/uploads';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hx_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('hx_token');
      localStorage.removeItem('hx_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
