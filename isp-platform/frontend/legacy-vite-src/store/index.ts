import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Token, Client, MSTBox, Alert } from '../types';

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: Token) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (tokenData: Token) => set({
        user: tokenData.user,
        token: tokenData.access_token,
        isAuthenticated: true,
      }),
      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
      }),
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
      setToken: (token) => set({
        token,
        isAuthenticated: true,
      }),
      setUser: (user) => set({
        user,
      }),
    }),
    {
      name: 'isp-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Map Store
interface MapState {
  selectedClientId: number | null;
  selectedMstId: number | null;
  selectedRouteId: number | null;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  showClients: boolean;
  showMST: boolean;
  showFibreRoutes: boolean;
  showDropLines: boolean;
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  
  selectClient: (id: number | null) => void;
  selectMst: (id: number | null) => void;
  selectRoute: (id: number | null) => void;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  toggleClients: () => void;
  toggleMST: () => void;
  toggleFibreRoutes: () => void;
  toggleDropLines: () => void;
  setMapType: (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedClientId: null,
  selectedMstId: null,
  selectedRouteId: null,
  mapCenter: { lat: 35.1856, lng: 33.3823 }, // Default: Cyprus
  mapZoom: 12,
  showClients: true,
  showMST: true,
  showFibreRoutes: true,
  showDropLines: true,
  mapType: 'hybrid',
  
  selectClient: (id) => set({ selectedClientId: id, selectedMstId: null, selectedRouteId: null }),
  selectMst: (id) => set({ selectedMstId: id, selectedClientId: null, selectedRouteId: null }),
  selectRoute: (id) => set({ selectedRouteId: id, selectedClientId: null, selectedMstId: null }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  toggleClients: () => set((state) => ({ showClients: !state.showClients })),
  toggleMST: () => set((state) => ({ showMST: !state.showMST })),
  toggleFibreRoutes: () => set((state) => ({ showFibreRoutes: !state.showFibreRoutes })),
  toggleDropLines: () => set((state) => ({ showDropLines: !state.showDropLines })),
  setMapType: (type) => set({ mapType: type }),
}));

// UI Store
interface UIState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelContent: 'client' | 'mst' | 'route' | 'activity' | null;
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (index: number) => void;
  clearAlerts: () => void;
  toggleSidebar: () => void;
  openRightPanel: (content: 'client' | 'mst' | 'route' | 'activity') => void;
  closeRightPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: false,
  rightPanelContent: null,
  alerts: [],
  
  addAlert: (alert) => set((state) => ({
    alerts: [...state.alerts, alert],
  })),
  removeAlert: (index) => set((state) => ({
    alerts: state.alerts.filter((_, i) => i !== index),
  })),
  clearAlerts: () => set({ alerts: [] }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openRightPanel: (content) => set({ rightPanelOpen: true, rightPanelContent: content }),
  closeRightPanel: () => set({ rightPanelOpen: false, rightPanelContent: null }),
}));

// Client Detail Store (for CRM-Map linking)
interface ClientDetailState {
  selectedClient: Client | null;
  networkPath: unknown | null;
  setClient: (client: Client | null) => void;
  setNetworkPath: (path: unknown) => void;
  clear: () => void;
}

export const useClientDetailStore = create<ClientDetailState>((set) => ({
  selectedClient: null,
  networkPath: null,
  setClient: (client) => set({ selectedClient: client }),
  setNetworkPath: (path) => set({ networkPath: path }),
  clear: () => set({ selectedClient: null, networkPath: null }),
}));

// MST Detail Store
interface MSTDetailState {
  selectedMST: MSTBox | null;
  connectedClients: Client[];
  setMST: (mst: MSTBox | null) => void;
  setConnectedClients: (clients: Client[]) => void;
  clear: () => void;
}

export const useMSTDetailStore = create<MSTDetailState>((set) => ({
  selectedMST: null,
  connectedClients: [],
  setMST: (mst) => set({ selectedMST: mst }),
  setConnectedClients: (clients) => set({ connectedClients: clients }),
  clear: () => set({ selectedMST: null, connectedClients: [] }),
}));