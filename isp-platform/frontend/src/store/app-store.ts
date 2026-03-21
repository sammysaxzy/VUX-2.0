import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AlertItem, DashboardRealtimePayload, EngineerActivity, KpiSnapshot, TenantBranding, User } from "@/types";
type ActiveModal = "fibre-details" | "mst-details" | null;
type ModalType = "mst-details" | "fiber-details" | "closure-details" | null;
type ActivePanel = ModalType;

type AppState = {
  token?: string;
  user?: User;
  branding?: TenantBranding;
  selectedMSTId?: string;
  selectedFiberId?: string;
  selectedClosureId?: string;
  modalType: ModalType;
  activePanel: ActivePanel;
  activeModal: ActiveModal;
  realtimeKpis?: Partial<KpiSnapshot>;
  realtimeAlerts: AlertItem[];
  recentActivity: EngineerActivity[];
  setAuth: (payload: { token: string; user: User; branding: TenantBranding }) => void;
  setBranding: (branding: TenantBranding) => void;
  logout: () => void;
  setSelectedMST: (mstId?: string) => void;
  setSelectedFiber: (fiberId?: string) => void;
  setSelectedClosure: (closureId?: string) => void;
  setModalType: (modal: ModalType) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setActiveModal: (modal: ActiveModal) => void;
  applyRealtimePayload: (payload: DashboardRealtimePayload) => void;
  clearRealtime: () => void;
};

const initialRealtime = {
  realtimeKpis: undefined,
  realtimeAlerts: [],
  recentActivity: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: undefined,
      user: undefined,
      branding: undefined,
      selectedMSTId: undefined,
      selectedFiberId: undefined,
      selectedClosureId: undefined,
      modalType: null,
      activePanel: null,
      activeModal: null,
      ...initialRealtime,
      setAuth: ({ token, user, branding }) => set({ token, user, branding }),
      setBranding: (branding) => set({ branding }),
      logout: () => set({ token: undefined, user: undefined, branding: undefined, ...initialRealtime }),
      setSelectedMST: (mstId) => set({ selectedMSTId: mstId }),
      setSelectedFiber: (fiberId) => set({ selectedFiberId: fiberId }),
      setSelectedClosure: (closureId) => set({ selectedClosureId: closureId }),
      setModalType: (modal) => set({ modalType: modal, activePanel: modal }),
      setActivePanel: (panel) => set({ activePanel: panel, modalType: panel }),
      setActiveModal: (modal) =>
        set({
          activeModal: modal,
          modalType: modal === "fibre-details" ? "fiber-details" : modal,
          activePanel: modal === "fibre-details" ? "fiber-details" : modal,
        }),
      applyRealtimePayload: (payload) =>
        set((state) => ({
          realtimeKpis: payload.kpis ? { ...state.realtimeKpis, ...payload.kpis } : state.realtimeKpis,
          realtimeAlerts: payload.alerts ? [...payload.alerts, ...state.realtimeAlerts].slice(0, 15) : state.realtimeAlerts,
          recentActivity: payload.activity ? [payload.activity, ...state.recentActivity].slice(0, 20) : state.recentActivity,
        })),
      clearRealtime: () => set(initialRealtime),
    }),
    {
      name: "oss-bss-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        branding: state.branding,
      }),
    },
  ),
);

export const useTenantId = () => useAppStore((state) => state.branding?.tenantId ?? state.user?.tenantId ?? "");
