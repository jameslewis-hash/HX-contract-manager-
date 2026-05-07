import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hx_token');
    const saved = localStorage.getItem('hx_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('hx_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('hx_token');
          localStorage.removeItem('hx_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('hx_token', res.data.token);
    localStorage.setItem('hx_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('hx_token');
    localStorage.removeItem('hx_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
