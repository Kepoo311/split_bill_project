import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillGroup, BillHistory } from '../types';
import { generateId } from '../utils/ids';
import { mergeGroupMembers } from '../utils/groupBalance';

const GROUPS_KEY = '@split_bill_groups_v1';

interface GroupState {
  groups: BillGroup[];
  loaded: boolean;
  loadGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<BillGroup>;
  deleteGroup: (id: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  addBillToGroup: (groupId: string, bill: BillHistory, payerId: string | null) => Promise<void>;
  removeEntry: (groupId: string, billId: string) => Promise<void>;
  /** Tandai anggota lunas; bukti transfer opsional (path file lokal permanen). */
  settleMember: (groupId: string, memberId: string, proofUri?: string) => Promise<void>;
  unsettleMember: (groupId: string, memberId: string) => Promise<void>;
}

const persist = async (groups: BillGroup[]) => {
  await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
};

const updateGroup = (
  groups: BillGroup[],
  groupId: string,
  transform: (group: BillGroup) => BillGroup,
): BillGroup[] => groups.map((g) => (g.id === groupId ? transform(g) : g));

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  loaded: false,

  loadGroups: async () => {
    try {
      const raw = await AsyncStorage.getItem(GROUPS_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const groups = Array.isArray(parsed)
        ? parsed.filter(
            (g): g is BillGroup =>
              !!g && typeof g === 'object' && typeof (g as BillGroup).id === 'string' &&
              Array.isArray((g as BillGroup).entries),
          )
        : [];
      set({ groups, loaded: true });
    } catch (e) {
      console.warn('Gagal memuat grup:', e);
      set({ loaded: true });
    }
  },

  createGroup: async (name) => {
    const cleanName = name.trim();
    const group: BillGroup = {
      id: generateId(),
      name: cleanName || 'Grup Patungan',
      createdAt: new Date().toISOString(),
      members: [],
      entries: [],
      settlements: {},
    };
    const updated = [group, ...get().groups];
    await persist(updated);
    set({ groups: updated });
    return group;
  },

  deleteGroup: async (id) => {
    const updated = get().groups.filter((g) => g.id !== id);
    await persist(updated);
    set({ groups: updated });
  },

  renameGroup: async (id, name) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const updated = updateGroup(get().groups, id, (g) => ({ ...g, name: cleanName }));
    await persist(updated);
    set({ groups: updated });
  },

  addBillToGroup: async (groupId, bill, payerId) => {
    const updated = updateGroup(get().groups, groupId, (g) => {
      // Anggota bill digabung berdasarkan nama; penalang harus anggota grup.
      const members = mergeGroupMembers(g.members, bill.members);
      const safePayerId =
        payerId && members.some((m) => m.id === payerId) ? payerId : null;
      const entries = g.entries.some((e) => e.billId === bill.id)
        ? g.entries
        : [...g.entries, { billId: bill.id, payerId: safePayerId, addedAt: new Date().toISOString() }];
      return { ...g, members, entries };
    });
    await persist(updated);
    set({ groups: updated });
  },

  removeEntry: async (groupId, billId) => {
    const updated = updateGroup(get().groups, groupId, (g) => ({
      ...g,
      entries: g.entries.filter((e) => e.billId !== billId),
    }));
    await persist(updated);
    set({ groups: updated });
  },

  settleMember: async (groupId, memberId, proofUri) => {
    const updated = updateGroup(get().groups, groupId, (g) => ({
      ...g,
      settlements: {
        ...g.settlements,
        [memberId]: {
          settledAt: new Date().toISOString(),
          ...(proofUri ? { proofUri } : {}),
        },
      },
    }));
    await persist(updated);
    set({ groups: updated });
  },

  unsettleMember: async (groupId, memberId) => {
    const updated = updateGroup(get().groups, groupId, (g) => {
      const settlements = { ...g.settlements };
      delete settlements[memberId];
      return { ...g, settlements };
    });
    await persist(updated);
    set({ groups: updated });
  },
}));
