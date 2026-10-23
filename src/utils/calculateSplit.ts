import { BillItem, Member, MemberBillSummary } from '../types';

export interface TaxConfig {
  type: 'percent' | 'nominal';
  value: number;
}

export const calculateSplit = (
  items: BillItem[],
  members: Member[],
  taxInput: TaxConfig,
  serviceCharge: number,
  discount: number = 0
): {
  results: MemberBillSummary[];
  subtotal: number;
  totalTax: number;
  totalService: number;
  totalDiscount: number;
  grandTotal: number;
} => {
  const memberIds = new Set(members.map((m) => m.id));
  const subtotalKeseluruhan = items.reduce((acc, it) => acc + it.harga, 0);

  const nominalPajak =
    taxInput.type === 'percent'
      ? (subtotalKeseluruhan * (taxInput.value || 0)) / 100
      : taxInput.value || 0;

  const totalExtra = nominalPajak + serviceCharge - discount;

  // Subtotal per orang disimpan sebagai float, dibulatkan sekali di akhir.
  // Item tanpa pemilik sah ditanggung SEMUA anggota: kalau dilewati, uangnya
  // hilang - grandTotal tetap menghitung item itu tapi tak ada yang membayar.
  const personSubtotals: Record<string, number> = {};
  members.forEach((m) => (personSubtotals[m.id] = 0));

  items.forEach((item) => {
    const owners = (item.assignedTo || []).filter((id) => memberIds.has(id));
    const targets = owners.length > 0 ? owners : members.map((m) => m.id);
    if (targets.length === 0) return;
    const share = item.harga / targets.length;
    targets.forEach((id) => {
      personSubtotals[id] += share;
    });
  });

  const exact = members.map((m) => {
    const subtotalOrang = personSubtotals[m.id];
    const ratio = subtotalKeseluruhan > 0 ? subtotalOrang / subtotalKeseluruhan : 0;
    return {
      member: m,
      subtotalOrang,
      taxShare: ratio * nominalPajak,
      serviceShare: ratio * serviceCharge,
      discountShare: ratio * discount,
      total: subtotalOrang + ratio * totalExtra,
    };
  });

  const grandTotal = Math.max(0, Math.round(subtotalKeseluruhan + totalExtra));

  // Largest remainder: jumlah totalBayar semua orang PERSIS grandTotal.
  // Math.round per orang bisa meleset beberapa rupiah ke arah mana pun.
  const totals = exact.map((e) => Math.floor(e.total));
  let remainder = grandTotal - totals.reduce((a, b) => a + b, 0);
  const byFraction = exact
    .map((e, i) => ({ i, frac: e.total - Math.floor(e.total) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of byFraction) {
    if (remainder > 0) {
      totals[i] += 1;
      remainder -= 1;
    } else if (remainder < 0 && totals[i] > 0) {
      totals[i] -= 1;
      remainder += 1;
    }
  }

  const results: MemberBillSummary[] = exact.map((e, i) => ({
      memberId: e.member.id,
      name: e.member.name,
      subtotal: Math.round(e.subtotalOrang),
      taxShare: Math.round(e.taxShare),
      serviceShare: Math.round(e.serviceShare),
      discountShare: Math.round(e.discountShare),
      totalBayar: Math.max(0, totals[i]),
    }));

  return {
    results,
    subtotal: subtotalKeseluruhan,
    totalTax: Math.round(nominalPajak),
    totalService: serviceCharge,
    totalDiscount: discount,
    grandTotal,
  };
};
