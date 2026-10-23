import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillHistory, LearningData, BillItem, PaymentMethod } from '../types';

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

export const useBillStore = create<BillState>((set, get) => ({
  history: [],
  learningData: [],
  paymentMethods: [],
  paymentMethodsLoaded: false,
  loadHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ history: JSON.parse(raw) });
      }
    } catch (e) {
      console.warn('Gagal memuat riwayat:', e);
    }
  },
  saveBill: async (billData) => {
        const newEntry: BillHistory = {
          ...billData,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
        };
        const updated = [newEntry, ...get().history].slice(0, MAX_HISTORY);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        set({ history: updated });
        return newEntry;
      },
  deleteBill: async (id: string) => {
    const updated = get().history.filter((item) => item.id !== id);
    set({ history: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menghapus riwayat:', e);
    }
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
    set({ history: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal memperbarui status bayar:', e);
    }
  },
  updateBillCategory: async (billId: string, category: string) => {
    const updated = get().history.map((bill) =>
      bill.id === billId ? { ...bill, category } : bill
    );
    set({ history: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal update kategori:', e);
    }
  },
  saveLearningData: async (rawOcrText: string, correctedItems: BillItem[]) => {
      const newLearning: LearningData = {
        id: crypto.randomUUID(),
        rawOcrText,
        correctedItems,
        createdAt: new Date().toISOString(),
      };
      const updated = [newLearning, ...get().learningData];
      set({ learningData: updated });
      await AsyncStorage.setItem(LEARNING_KEY, JSON.stringify(updated));
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
        id: crypto.randomUUID(),
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
