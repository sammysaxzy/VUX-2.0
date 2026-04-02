import { create } from "zustand";
import type { PrivilegeMember } from "@/types";

export type AdminMember = PrivilegeMember;

type AdminState = {
  members: AdminMember[];
  setMembers: (members: AdminMember[]) => void;
  addMember: (member: AdminMember) => void;
  removeMembers: (ids: string[]) => void;
  updateMember: (id: string, patch: Partial<AdminMember>) => void;
};

export const useAdminStore = create<AdminState>()((set) => ({
  members: [],
  setMembers: (members) => set({ members }),
  addMember: (member) => set((state) => ({ members: [member, ...state.members.filter((entry) => entry.id !== member.id)] })),
  removeMembers: (ids) => {
    const idSet = new Set(ids);
    set((state) => ({ members: state.members.filter((member) => !idSet.has(member.id)) }));
  },
  updateMember: (id, patch) =>
    set((state) => ({
      members: state.members.map((member) => (member.id === id ? { ...member, ...patch } : member)),
    })),
}));
