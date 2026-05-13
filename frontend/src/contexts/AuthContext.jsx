import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USER = { name: 'HX User', role: 'editor' };

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: DEFAULT_USER, loading: false, login: () => {}, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
