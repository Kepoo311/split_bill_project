export interface BillItem {
  id: string;
  nama_item: string;
  harga: number;
  assignedTo?: string[];
}

export interface Member {
  id: string;
  name: string;
}

export interface MemberBillSummary {
  memberId: string;
  name: string;
  subtotal: number;
  taxShare: number;
  serviceShare: number;
  discountShare: number;
  totalBayar: number;
  isPaid?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'ewallet' | 'qris';
  name: string;
  accountNumber?: string;
  accountName?: string;
  qrisImageUri?: string;
}

export interface BillHistory {
  id: string;
  title: string;
  date: string;
  grandTotal: number;
  items: BillItem[];
  members: Member[];
  results: MemberBillSummary[];
  tax: number;
  service: number;
  discount: number;
  paidMemberIds?: string[];
  category?: string;
}

export interface LearningData {
  id: string;
  rawOcrText: string;
  correctedItems: BillItem[];
  createdAt: string;
}

export interface GroupEntry {
  billId: string;
  /** Anggota yang menalangi struk; null = dibayar masing-masing (tidak masuk netting). */
  payerId: string | null;
  addedAt: string;
}

export interface GroupSettlement {
  settledAt: string;
  /** Bukti transfer — opsional. */
  proofUri?: string;
}

export interface BillGroup {
  id: string;
  name: string;
  createdAt: string;
  members: Member[];
  entries: GroupEntry[];
  settlements: Record<string, GroupSettlement>;
}

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Ocr: { imageUri: string };
  Split: {
    items: BillItem[];
    initialTax?: number;
    initialTaxType?: 'percent' | 'nominal';
    initialService?: number;
    initialDiscount?: number;
  };
  Summary: {
    items: BillItem[];
    members: Member[];
    results: MemberBillSummary[];
    subtotal: number;
    tax: number;
    service: number;
    discount: number;
    grandTotal: number;
  };
  HistoryDetail: { bill: BillHistory };
  CameraScanner: undefined;
  Settings: undefined;
  ShareBill: { bill: BillHistory };
  Groups: undefined;
  GroupDetail: { groupId: string };
};
