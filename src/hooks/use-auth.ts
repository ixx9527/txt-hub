import { create } from 'zustand';
import { api } from './use-api';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('txthub_token'),
  loading: true,

  login: async (login: string, password: string) => {
    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { login, password },
    });
    localStorage.setItem('txthub_token', data.token);
    set({ user: data.user, token: data.token });
  },

  register: async (username: string, email: string, password: string) => {
    const data = await api<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: { username, email, password },
    });
    localStorage.setItem('txthub_token', data.token);
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem('txthub_token');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('txthub_token');
    if (!token) {
      set({ loading: false, user: null, token: null });
      return;
    }
    try {
      const user = await api<User>('/auth/me', { token });
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem('txthub_token');
      set({ user: null, token: null, loading: false });
    }
  },
}));
