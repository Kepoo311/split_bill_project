import { BillHistory } from '../types';

/**
 * Pencarian riwayat transaksi. Cocokkan judul, nama item, DAN nama anggota
 * (case-insensitive, spasi berlebih diabaikan) supaya "kopi", "andi", atau
 * "futsal" semua menemukan tagihannya. Digabung dengan filter kategori.
 */

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

export const filterHistory = (
  history: BillHistory[],
  query: string,
  category: string,
): BillHistory[] => {
  const needle = normalize(query);
  return history.filter((bill) => {
    if (category !== 'Semua' && (bill.category || 'Makanan') !== category) {
      return false;
    }
    if (!needle) return true;
    if (normalize(bill.title).includes(needle)) return true;
    if (bill.items.some((item) => normalize(item.nama_item).includes(needle))) return true;
    if (bill.members.some((member) => normalize(member.name).includes(needle))) return true;
    return false;
  });
};
