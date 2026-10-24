import { BillGroup, BillHistory, Member } from '../types';

/**
 * Saldo grup patungan berjalan, dihitung murni dari struk-struk yang
 * terdaftar. Anggota yang menalangi struk mendapat kredit sebesar grand
 * total; setiap anggota yang ikut makan berutang sebesar bagiannya. Karena
 * jumlah totalBayar sebuah struk persis sama dengan grand total-nya
 * (invariant calculateSplit), jumlah semua saldo grup selalu 0.
 *
 * Anggota antar struk digabung berdasarkan NAMA (case-insensitive), bukan
 * id — setiap struk dibuat dengan member id sendiri ("1" = "Saya") sehingga
 * id yang sama bisa berarti orang berbeda.
 */

export interface MemberBalance {
  memberId: string;
  name: string;
  /** positif = berhak menerima, negatif = masih berutang, 0 = impas */
  balance: number;
}

export interface GroupTotals {
  balances: MemberBalance[];
  /** jumlah grand total seluruh struk yang tercatat */
  totalSpent: number;
  /** jumlah entri yang tidak mencatat siapa penalang (tidak masuk netting) */
  unattributedCount: number;
  /** true bila ada anggota bill yang tidak dikenal di grup (seharusnya sudah digabung saat entri ditambahkan) */
  hasUnknownMembers: boolean;
}

const normName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export const computeGroupTotals = (
  group: BillGroup,
  billsById: Map<string, BillHistory>,
): GroupTotals => {
  const balance: Record<string, number> = {};
  group.members.forEach((m) => {
    balance[m.id] = 0;
  });
  const memberByNormName = new Map(group.members.map((m) => [normName(m.name), m.id]));

  let totalSpent = 0;
  let unattributedCount = 0;
  let hasUnknownMembers = false;

  group.entries.forEach((entry) => {
    const bill = billsById.get(entry.billId);
    if (!bill) return;

    totalSpent += bill.grandTotal;

    if (entry.payerId && balance[entry.payerId] !== undefined) {
      balance[entry.payerId] += bill.grandTotal;
    } else if (!entry.payerId) {
      unattributedCount += 1;
    }

    bill.results.forEach((res) => {
      const targetId = memberByNormName.get(normName(res.name)) ?? res.memberId;
      if (balance[targetId] === undefined) {
        balance[targetId] = 0;
        hasUnknownMembers = true;
      }
      balance[targetId] -= res.totalBayar;
    });
  });

  const balances: MemberBalance[] = Object.entries(balance)
    .map(([memberId, value]) => {
      const member = group.members.find((m) => m.id === memberId);
      return { memberId, name: member?.name ?? memberId, balance: Math.round(value) };
    })
    .sort((a, b) => b.balance - a.balance);

  return { balances, totalSpent, unattributedCount, hasUnknownMembers };
};

/**
 * Gabungkan anggota sebuah bill ke anggota grup (berdasarkan nama) dan
 * kembalikan daftar member baru bila ada yang belum terdaftar.
 */
export const mergeGroupMembers = (groupMembers: Member[], billMembers: Member[]): Member[] => {
  const byNormName = new Map(groupMembers.map((m) => [normName(m.name), m]));
  const merged = [...groupMembers];
  billMembers.forEach((m) => {
    if (!byNormName.has(normName(m.name))) {
      merged.push(m);
      byNormName.set(normName(m.name), m);
    }
  });
  return merged;
};
