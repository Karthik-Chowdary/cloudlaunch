import { create } from 'zustand';
import type { VMStatus } from '../types';

interface AppState {
  statusFilter: VMStatus | 'all';
  setStatusFilter: (filter: VMStatus | 'all') => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  statusFilter: 'all',
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
