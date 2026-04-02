'use client';

import { create } from 'zustand';
import type { User } from '@qarevel/shared-types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await api.login(email, password);
    localStorage.setItem('qarevel_access_token', response.accessToken);
    localStorage.setItem('qarevel_refresh_token', response.refreshToken);
    set({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('qarevel_access_token');
    localStorage.removeItem('qarevel_refresh_token');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadUser: async () => {
    const token = localStorage.getItem('qarevel_access_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await api.getMe();
      set({
        user,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('qarevel_access_token');
      localStorage.removeItem('qarevel_refresh_token');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
