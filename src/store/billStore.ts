import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillHistory, LearningData, BillItem, PaymentMethod } from '../types';
import { generateId } from '../utils/ids';

interface BillState {
  history: BillHistory[];
  learningData: LearningData[];
  paymentMethods: PaymentMethod[];
  paymentMethodsLoaded: boolean;
  loadHistory: () => Promise<void>;
  saveBill: (billData: Omit<BillHistory, 'id' | 'date'>) => Promise<BillHistory>;
  deleteBill: (id: string) => Promise<void>;
  toggleMemberPayment: (billId: string, memberId: string) => Promise<void>;
  updateBillCategory: (billId: string, category: string) => Promise<void>;
  updateBillTitle: (billId: string, title: string) => Promise<void>;
  saveLearningData: (rawOcrText: string, correctedItems: BillItem[]) => Promise<void>;
  loadLearningData: () => Promise<LearningData[]>;
  loadPaymentMethods: () => Promise<void>;
  savePaymentMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
}

const STORAGE_KEY = '@split_bill_history_v1';
const LEARNING_KEY = '@split_bill_learning_v1';
const PAYMENT_METHODS_KEY = '@split_bill_payment_methods_v1';
const MAX_HISTORY = 200;
const MAX_LEARNING = 60;

/**
 * Validasi best-effort satu entri riwayat. Entri rusak (mis. data setengah
 * tertulis) dibuang saat load agar satu data buruk tidak merobohkan seluruh
 * riwayat. Saat schema BillHistory berubah secara breaking, tambahkan
 * migrasi per versi di loadHistory sebelum validasi ini.
 */
const isValidBill = (entry: unknown): entry is BillHistory =>
  !!entry &&
  typeof entry === 'object' &&
  typeof (entry as BillHistory).id === 'string' &&
  typeof (entry as BillHistory).date === 'string' &&
  Array.isArray((entry as BillHistory).items) &&
  Array.isArray((entry as BillHistory).results) &&
  typeof (entry as BillHistory).grandTotal === 'number';

export const useBillStore = create<BillState>((set, get) => ({
  history: [],
  learningData: [],
  paymentMethods: [],
  paymentMethodsLoaded: false,
  loadHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn('Data riwayat berformat tak dikenal, direset.');
        set({ history: [] });
        return;
      }
      const valid = parsed.filter(isValidBill);
      if (valid.length !== parsed.length) {
        console.warn(`${parsed.length - valid.length} entri riwayat rusak dibuang.`);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid)).catch(() => {});
      }
      set({ history: valid });
    } catch (e) {
      console.warn('Gagal memuat riwayat:', e);
    }
  },
  saveBill: async (billData) => {
        const newEntry: BillHistory = {
          ...billData,
          id: generateId(),
          date: new Date().toISOString(),
        };
        const updated = [newEntry, ...get().history].slice(0, MAX_HISTORY);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        set({ history: updated });
        return newEntry;
      },
  deleteBill: async (id: string) => {
    const updated = get().history.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ history: updated });
  },
  toggleMemberPayment: async (billId: string, memberId: string) => {
    const updated = get().history.map((bill) => {
      if (bill.id !== billId) return bill;
      const currentPaid = bill.paidMemberIds || [];
      const isPaid = currentPaid.includes(memberId);
      const newPaid = isPaid
        ? currentPaid.filter((id) => id !== memberId)
        : [...currentPaid, memberId];
      return {
        ...bill,
        paidMemberIds: newPaid,
      };
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ history: updated });
  },
  updateBillCategory: async (billId: string, category: string) => {
    const updated = get().history.map((bill) =>
      bill.id === billId ? { ...bill, category } : bill
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ history: updated });
  },
  updateBillTitle: async (billId: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const updated = get().history.map((bill) =>
      bill.id === billId ? { ...bill, title: cleanTitle } : bill
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ history: updated });
  },
  saveLearningData: async (rawOcrText: string, correctedItems: BillItem[]) => {
      const newLearning: LearningData = {
        id: generateId(),
        rawOcrText,
        correctedItems,
        createdAt: new Date().toISOString(),
      };
      // Struk yang sama di-scan ulang menimpa koreksi lama (dedupe), jumlah
      // entri dibatasi agar storage tidak tumbuh tanpa akhir.
      const normalizeKey = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
      const deduped = get().learningData.filter(
        (l) => normalizeKey(l.rawOcrText) !== normalizeKey(rawOcrText)
      );
      const updated = [newLearning, ...deduped].slice(0, MAX_LEARNING);
      await AsyncStorage.setItem(LEARNING_KEY, JSON.stringify(updated));
      set({ learningData: updated });
    },
  loadLearningData: async () => {
    try {
      const raw = await AsyncStorage.getItem(LEARNING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ learningData: parsed });
        return parsed;
      }
    } catch (e) {
      console.warn('Gagal memuat data pembelajaran:', e);
    }
    return [];
  },
  loadPaymentMethods: async () => {
    try {
      const raw = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
      const paymentMethods: PaymentMethod[] = raw ? JSON.parse(raw) : [];
      set({ paymentMethods, paymentMethodsLoaded: true });
    } catch (e) {
      console.warn('Gagal memuat payment methods:', e);
      throw e;
    }
  },
  savePaymentMethod: async (method) => {
      if (!get().paymentMethodsLoaded) {
        await get().loadPaymentMethods();
      }
      const newMethod: PaymentMethod = {
        ...method,
        id: generateId(),
      };
      const updated = [...get().paymentMethods, newMethod];
      await AsyncStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(updated));
      set({ paymentMethods: updated });
    },
  deletePaymentMethod: async (id: string) => {
    if (!get().paymentMethodsLoaded) {
      await get().loadPaymentMethods();
    }
    const updated = get().paymentMethods.filter((m) => m.id !== id);
    try {
      await AsyncStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menghapus payment method:', e);
      throw e;
    }
    set({ paymentMethods: updated });
  },
}));
