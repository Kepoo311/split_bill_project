import { BillItem, Member, MemberBillSummary } from '../types';

export interface TaxConfig {
  type: 'percent' | 'nominal';
  value: number;
}

export const calculateSplit = (
  items: BillItem[],
  members: Member[],
  taxInput: TaxConfig | number,
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
  const subtotalKeseluruhan = items.reduce((acc, it) => acc + it.harga, 0);
  
  let nominalPajak = 0;
  if (typeof taxInput === 'number') {
    nominalPajak = (subtotalKeseluruhan * taxInput) / 100;
  } else if (taxInput.type === 'percent') {
    nominalPajak = (subtotalKeseluruhan * (taxInput.value || 0)) / 100;
  } else {
    nominalPajak = taxInput.value || 0;
  }

  const totalExtra = nominalPajak + serviceCharge - discount;

  // Hitung subtotal per orang
  const personSubtotals: Record<string, number> = {};
  members.forEach((m) => (personSubtotals[m.id] = 0));

  items.forEach((item) => {
    const shareCount = item.assignedTo?.length || 0;
    if (shareCount > 0) {
      const splitPrice = item.harga / shareCount;
      item.assignedTo!.forEach((mId) => {
        personSubtotals[mId] = (personSubtotals[mId] || 0) + splitPrice;
      });
    }
  });

  // Total akhir: Subtotal + Proporsi Biaya Tambahan - Proporsi Diskon
  const results = members.map((m) => {
    const subtotalOrang = personSubtotals[m.id] || 0;
    const extraOrang =
      subtotalKeseluruhan > 0
        ? (subtotalOrang / subtotalKeseluruhan) * totalExtra
        : 0;
    const taxShare = subtotalKeseluruhan > 0
      ? (subtotalOrang / subtotalKeseluruhan) * nominalPajak
      : 0;
    const serviceShare = subtotalKeseluruhan > 0
      ? (subtotalOrang / subtotalKeseluruhan) * serviceCharge
      : 0;
    const discountShare = subtotalKeseluruhan > 0
      ? (subtotalOrang / subtotalKeseluruhan) * discount
      : 0;

    return {
      memberId: m.id,
      name: m.name,
      subtotal: Math.round(subtotalOrang),
      taxShare: Math.round(taxShare),
      serviceShare: Math.round(serviceShare),
      discountShare: Math.round(discountShare),
      totalBayar: Math.round(subtotalOrang + extraOrang),
    };
  });

  return {
    results,
    subtotal: subtotalKeseluruhan,
    totalTax: nominalPajak,
    totalService: serviceCharge,
    totalDiscount: discount,
    grandTotal: subtotalKeseluruhan + totalExtra,
  };
};
