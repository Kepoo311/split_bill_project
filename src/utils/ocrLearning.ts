import { BillItem, LearningData } from '../types';
import { parseReceiptText } from './ocrParser';
import { generateId } from './ids';

/**
 * Fitur belajar OCR — bukan ML: mengingat koreksi user dan menerapkannya lagi.
 *
 * Level 1: cache koreksi — struk yang sama di-scan ulang memakai hasil
 * koreksi terakhir langsung.
 * Level 2: memori per merchant — kamus nama item (memperbaiki salah-baca
 * huruf via jarak edit), peta rename, dan penekan baris sampah yang
 * berulang. Semua dibangun ulang dari data koreksi saat launch dengan
 * me-reparse teks lama (parser deterministik), jadi tidak perlu perubahan
 * schema penyimpanan.
 */

const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

const normalizeName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const KNOWN_MERCHANTS: [RegExp, string][] = [
  [/faste(\s+coffee)?/i, 'faste'],
  [/stopone(\s+cafe)?/i, 'stopone'],
  [/indomaret/i, 'indomaret'],
  [/alfamart|alfamidi/i, 'alfamart'],
  [/mie\s+jumbo/i, 'mie-jumbo'],
];

const detectMerchant = (ocrText: string): { key: string; name: string } => {
  const head = ocrText.split('\n').slice(0, 8).join('\n');
  for (const [pattern, key] of KNOWN_MERCHANTS) {
    const match = head.match(pattern);
    if (match) return { key, name: match[0] };
  }
  const firstLine = ocrText.split('\n').find((line) => /[A-Za-z]{4,}/.test(line)) ?? '';
  const key = normalizeName(firstLine).split(' ').slice(0, 3).join('-');
  return { key: key || 'unknown', name: firstLine.trim() || 'Tidak dikenal' };
};

const editDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        prev[j] + 1,
        current[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = current;
  }
  return prev[b.length];
};

export interface MerchantProfile {
  key: string;
  displayName: string;
  /** nama terkoreksi (ternormalisasi) → frekuensi kemunculan */
  dictionary: Record<string, number>;
  /** nama ternormalisasi → bentuk tampilan terakhir dari user */
  displays: Record<string, string>;
  /** nama hasil parser (ternormalisasi) → nama koreksi user */
  renames: Record<string, string>;
  /** item hasil parser yang dihapus user (ternormalisasi) → jumlah kejadian */
  junk: Record<string, number>;
}

export interface LearningIndex {
  cache: Map<string, BillItem[]>;
  merchants: Map<string, MerchantProfile>;
}

const ensureProfile = (
  merchants: Map<string, MerchantProfile>,
  key: string,
  displayName: string,
): MerchantProfile => {
  let profile = merchants.get(key);
  if (!profile) {
    profile = { key, displayName, dictionary: {}, displays: {}, renames: {}, junk: {} };
    merchants.set(key, profile);
  }
  return profile;
};

/** Pasangkan item hasil parser dengan item koreksi user (harga sama > nama mirip). */
const pairItems = (parsed: BillItem[], corrected: BillItem[]) => {
  const usedCorrected = new Set<number>();
  const matchedParsed = new Set<number>();
  const pairs: [BillItem, BillItem][] = [];
  parsed.forEach((p, pIndex) => {
    let best = -1;
    let bestScore = Infinity;
    corrected.forEach((c, cIndex) => {
      if (usedCorrected.has(cIndex)) return;
      const distance = editDistance(normalizeName(p.nama_item), normalizeName(c.nama_item));
      const priceSame = p.harga === c.harga;
      if (!priceSame && distance > 3) return;
      const score = distance + (priceSame ? 0 : 5);
      if (score < bestScore) {
        bestScore = score;
        best = cIndex;
      }
    });
    if (best >= 0) {
      usedCorrected.add(best);
      matchedParsed.add(pIndex);
      pairs.push([p, corrected[best]]);
    }
  });
  return {
    pairs,
    unmatchedParsed: parsed.filter((_, i) => !matchedParsed.has(i)),
  };
};

export const buildLearningIndex = (entries: LearningData[]): LearningIndex => {
  const cache = new Map<string, BillItem[]>();
  const merchants = new Map<string, MerchantProfile>();
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  sorted.forEach((entry) => {
    cache.set(normalizeText(entry.rawOcrText), entry.correctedItems);

    const { key, name } = detectMerchant(entry.rawOcrText);
    const profile = ensureProfile(merchants, key, name);
    const parsed = parseReceiptText(entry.rawOcrText);
    const { pairs, unmatchedParsed } = pairItems(parsed, entry.correctedItems);

    pairs.forEach(([parsedItem, correctedItem]) => {
      const correctedNorm = normalizeName(correctedItem.nama_item);
      profile.dictionary[correctedNorm] = (profile.dictionary[correctedNorm] ?? 0) + 1;
      profile.displays[correctedNorm] = correctedItem.nama_item;
      if (normalizeName(parsedItem.nama_item) !== correctedNorm) {
        profile.renames[normalizeName(parsedItem.nama_item)] = correctedItem.nama_item;
      }
    });

    unmatchedParsed.forEach((parsedItem) => {
      const junkKey = normalizeName(parsedItem.nama_item);
      // Hanya nama berbobot yang dicatat; kejadian tunggal belum menekan
      // (bisa jadi item yang memang bukan milik siapa pun), dua kejadian
      // berarti pola berulang dari layout merchant itu.
      profile.junk[junkKey] = (profile.junk[junkKey] ?? 0) + 1;
    });
  });

  return { cache, merchants };
};

// Item yang dihapus user baru ditekan setelah terlihat berulang — lihat
// catatan di buildLearningIndex.
const JUNK_THRESHOLD = 2;
// Perbaikan kamus hanya untuk salah-baca ringan (jarak edit kecil), bukan
// penggantian nama yang jauh berbeda.
const DICT_MAX_DISTANCE = 2;

export interface LearningOutcome {
  items: BillItem[];
  cacheHit: boolean;
  fixes: number;
  merchant: string | null;
}

export const applyLearning = (
  parsedItems: BillItem[],
  ocrText: string,
  index: LearningIndex,
): LearningOutcome => {
  const cached = index.cache.get(normalizeText(ocrText));
  if (cached) {
    return {
      items: cached.map((item) => ({ ...item, id: generateId(), assignedTo: [] })),
      cacheHit: true,
      fixes: 0,
      merchant: null,
    };
  }

  const { key, name } = detectMerchant(ocrText);
  const profile = index.merchants.get(key);
  if (!profile) {
    return { items: parsedItems, cacheHit: false, fixes: 0, merchant: null };
  }

  const dictionaryKeys = Object.keys(profile.dictionary);
  let fixes = 0;
  const items: BillItem[] = [];

  parsedItems.forEach((item) => {
    const norm = normalizeName(item.nama_item);

    if ((profile.junk[norm] ?? 0) >= JUNK_THRESHOLD) {
      fixes += 1;
      return;
    }

    let finalName = item.nama_item;
    const rename = profile.renames[norm];
    if (rename) {
      finalName = rename;
      fixes += 1;
    } else if (!profile.dictionary[norm]) {
      const close = dictionaryKeys.find((k) => editDistance(norm, k) <= DICT_MAX_DISTANCE);
      if (close) {
        finalName = profile.displays[close];
        fixes += 1;
      }
    }

    items.push(finalName === item.nama_item ? item : { ...item, nama_item: finalName });
  });

  return { items, cacheHit: false, fixes, merchant: name };
};
