import { createContext, useContext, useState, type ReactNode,  } from 'react';

type User = { id: number; username: string; role: string } | null;

const AuthContext = createContext<{
  user: User;
  login: (u: User) => void;
  logout: () => void;
}>({ user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(() => {
    const raw = localStorage.getItem('mvpos_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem('mvpos_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mvpos_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);