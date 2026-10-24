import { BillItem, LearningData } from '../types/index';
import { generateId } from './ids';

const normalizeReceiptText = (text: string) =>
  text
    .replace(/(\d+)\s*[.,]\s*(\d{3})\b/g, '$1.$2')
    .replace(/\bix\s*@/gi, '1x @')
    .replace(/\bix\b/gi, '1x')
    .replace(/regul\s*ar/gi, 'Regular')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*([.,])\s*(?=\d{3}\b)/g, '$1')
    .trim();

const moneyPattern = /(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,})(?!\d)/i;
const parseMoney = (value: string) => {
  const digits = value.replace(/\D/g, '');
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : 0;
};

const makeItem = (name: string, price: number): BillItem => ({
  id: generateId(),
  nama_item: name.trim().replace(/\s+/g, ' '),
  harga: price,
  assignedTo: [],
});

const isAddress = (line: string) =>
  /(?:j[l1]\.?\s|jalan|prof\.\s*dr|gedong\s*meneng|sumantri|brojonegoro|kedaton|sidodadi|raj\s*abasa|kec\.|kel\.|kota|kab\.|lampung|indonesia|\b35\d{3}\b)/i.test(line);

const isMeta = (line: string) =>
  /^(?:(?:\d+[.)]\s*)?pesanan|struk pesanan|no\.?|tanggal|tangga\s*l|jam masuk|jam|waktu|no meja|mode|kasir|cashier|user|date|sales type|order type|order number|penjualan|caps|lock|shift|microsoft|office|home 2024|classic apps|total qty)\b/i.test(line) ||
  /^\d+\s+items?\b/i.test(line) ||
  /(?:quick service|dine in|take away|faste coffee|stopone cafe|unila|rajabasa)/i.test(line) ||
  /^[:\s]*(?:FC[RUO]|SFC|POS-|no\.\s*\d|[0-3]?\d[-/][01]?\d[-/]\d{2,4}|kasir|cashier)\b/i.test(line);

const isFooter = (line: string) =>
  /^(?:sub\s*total|service charge|tax|pajak|grand total|brand total|total(?:\s|$)|otal(?:\s|$)|al\s*item\b|harga jual|diskon|tunai|kembali|anda hemat|tender|or payment|qr payment|payment|qris|qr bni|b-\s*edc|change|charge|thank|terima|fastesukam|hembui|bulcan|bukti|pembayaran)\b/i.test(line);

const isNonItemLine = (line: string) =>
  !line ||
  isAddress(line) ||
  isMeta(line) ||
  /^(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}:\d{2}(?::\d{2})?|[.:,\-\s]+)$/i.test(line);

const pushPrice = (
  items: BillItem[],
  name: string,
  priceText: string,
  quantity = 1,
  minimumPrice = 100,
) => {
  const price = parseMoney(priceText);
  const cleanName = name
    .replace(/^\d+\s*[.)-]\s*/, '')
    // Awalan qty POS (mis. "1 MIE AYAM") dibuang hanya bila sisa nama masih
    // >= 2 kata, agar nama produk 1 kata berawasan angka seperti "7 UP" utuh.
    .replace(/^\d{1,2}\s+(?=\S+\s+\S)/, '')
    .replace(/^[\s:,-]+|[\s:,-]+$/g, '')
    .replace(/\s+/g, ' ');
  if (!cleanName || cleanName.length < 2 || price < minimumPrice || price > 10000000) return;

  // Keep one bill item per purchased unit so existing per-item assignment still works.
  const count = Math.max(1, Math.min(quantity, 30));
  for (let i = 0; i < count; i++) items.push(makeItem(cleanName, price));
};

interface RetailRow {
  name: string;
  quantity: number;
  unitPrice: number;
}

const retailNumber = String.raw`\d{1,7}(?:[.,]\s?\d{3})*`;

const totalsMatch = (quantity: number, unitPrice: number, total: number) =>
  quantity > 0 &&
  unitPrice > 0 &&
  total > 0 &&
  Math.abs(quantity * unitPrice - total) <= Math.max(2, unitPrice * 0.02);

const splitMergedRetailNames = (text: string, expectedCount: number): string[] => {
  const boundaries = [...text.matchAll(/\b\d{2,4}(?:\s*(?:ML|G|GR))?\s+(?=[A-Z])/gi)]
    .map((match) => (match.index ?? 0) + match[0].search(/\s/))
    .filter((index) => index > 0);

  if (expectedCount === 1) return [text.trim()];
  if (boundaries.length < expectedCount - 1) return [];

  const names: string[] = [];
  let start = 0;
  for (let i = 0; i < expectedCount - 1; i++) {
    const boundary = boundaries[i];
    names.push(text.slice(start, boundary).trim());
    start = boundary;
  }
  names.push(text.slice(start).trim());
  return names.every(Boolean) ? names : [];
};

const parseRetailRows = (line: string): RetailRow[] => {
  if (/^(?:diskon|harga jual|total|tunai|kembali|anda hemat)\b/i.test(line)) return [];

  // Numbers glued to letters ("45OO" garble, "72G"/"500ML" pack sizes) are
  // not price columns — drop them so they stay part of the product name.
  const matches = [...line.matchAll(new RegExp(retailNumber, 'g'))].filter((match) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    return !/[A-Za-zÀ-ÿ]/.test(line[start - 1] ?? '') && !/[A-Za-zÀ-ÿ]/.test(line[end] ?? '');
  });
  if (matches.length < 2) return [];
  const values = matches.map((match) => parseMoney(match[0]));
  // Retail rows end with their total column; header/license lines keep
  // trailing text after the numbers, so they never reach the row logic.
  const last = matches[matches.length - 1];
  if ((last.index ?? 0) + last[0].length < line.trimEnd().length) return [];
  const nameBefore = (count: number) => {
    const match = matches[matches.length - count];
    return match ? line.slice(0, match.index ?? 0).trim() : '';
  };

  // Two product entries were sometimes joined into one OCR row. POS columns
  // print both quantities, then both unit prices, then both line totals.
  if (values.length >= 6) {
    const [qtyA, qtyB, unitA, unitB, totalA, totalB] = values.slice(-6);
    const namePrefix = nameBefore(6);
    if (
      /[A-Za-zÀ-ÿ]/.test(namePrefix) &&
      Number.isInteger(qtyA) &&
      Number.isInteger(qtyB) &&
      totalsMatch(qtyA, unitA, totalA) &&
      totalsMatch(qtyB, unitB, totalB)
    ) {
      const names = splitMergedRetailNames(namePrefix, 2);
      if (names.length === 2) {
        return [
          { name: names[0], quantity: qtyA, unitPrice: unitA },
          { name: names[1], quantity: qtyB, unitPrice: unitB },
        ];
      }
    }
  }

  // OCR may omit a repeated unit-price column for a cheap second product,
  // leaving qtyA, qtyB, unitA, totalA, totalB. Infer unitB only if integral.
  if (values.length >= 5) {
    const [qtyA, qtyB, unitA, totalA, totalB] = values.slice(-5);
    const unitB = qtyB > 0 ? totalB / qtyB : 0;
    const namePrefix = nameBefore(5);
    if (
      /[A-Za-zÀ-ÿ]/.test(namePrefix) &&
      Number.isInteger(qtyA) &&
      Number.isInteger(qtyB) &&
      Number.isInteger(unitB) &&
      totalsMatch(qtyA, unitA, totalA) &&
      totalsMatch(qtyB, unitB, totalB)
    ) {
      const names = splitMergedRetailNames(namePrefix, 2);
      if (names.length === 2) {
        return [
          { name: names[0], quantity: qtyA, unitPrice: unitA },
          { name: names[1], quantity: qtyB, unitPrice: unitB },
        ];
      }
    }
  }

  const [quantity, unitPrice, total] = values.slice(-3);
  const namePrefix = nameBefore(3);
  if (
    values.length >= 3 &&
    /[A-Za-zÀ-ÿ]/.test(namePrefix) &&
    Number.isInteger(quantity) &&
    totalsMatch(quantity, unitPrice, total)
  ) {
    return [{ name: namePrefix, quantity, unitPrice }];
  }

  // ML Kit can garble or drop a single numeric column on a row (e.g. unit
  // price read as "45OO", or the qty digit missed). When qty x unit no
  // longer matches the printed total, re-read the last two columns as
  // [qty, total] or [unit, total]. Accept only exact division in sane
  // ranges; the name must have two consecutive letters so bare "1x ..."
  // price rows never qualify.
  const fallbackName = nameBefore(2);
  const [mid, totalValue] = values.slice(-2);
  if (/[A-Za-zÀ-ÿ]{2,}/.test(fallbackName) && Number.isInteger(mid)) {
    if (mid >= 1 && mid <= 99 && totalValue % mid === 0) {
      const unit = totalValue / mid;
      if (unit >= 100 && unit <= 10000000) {
        return [{ name: fallbackName, quantity: mid, unitPrice: unit }];
      }
    }
    if (mid >= 100 && mid <= 10000000 && totalValue % mid === 0) {
      const qty = totalValue / mid;
      if (qty >= 1 && qty <= 99) {
        return [{ name: fallbackName, quantity: qty, unitPrice: mid }];
      }
    }
  }

  return [];
};

const parseNumberedReceipt = (lines: string[]): BillItem[] => {
  const names: string[] = [];
  const prices: Array<{ price: string; quantity: number }> = [];

  for (const line of lines) {
    if (isFooter(line)) break;
    if (isMeta(line) || isAddress(line)) continue;

    const numbered = line.match(/^\d{1,2}[.)]\s*([A-Za-zÀ-ÿ].*)$/);
    if (numbered) {
      const name = numbered[1]
        .replace(/\s+\d{1,2}\s*[x×]\s*(?:@\s*)?(?:rp\s*)?.*$/i, '')
        .trim();
      if (name) names.push(name);
    }

    const price = line.match(
      /(\d{1,2})\s*[x×]\s*(?:@\s*)?(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,})/i,
    );
    if (price) prices.push({ quantity: Number(price[1]), price: price[2] });
  }

  if (names.length < 2 || prices.length < names.length) return [];

  const items: BillItem[] = [];
  for (let i = 0; i < names.length; i++) {
    pushPrice(items, names[i], prices[i].price, prices[i].quantity);
  }
  return items;
};

/**
 * Parses line-oriented receipt text. Input can be ML Kit's raw text or rows
 * reconstructed from its bounding boxes.
 */
export const parseReceiptText = (
  ocrRawText: string,
  _learningData: LearningData[] = [],
): BillItem[] => {
  const lines = normalizeReceiptText(ocrRawText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const numberedItems = parseNumberedReceipt(lines);
  if (numberedItems.length > 0) return numberedItems;

  const items: BillItem[] = [];
  let pendingName = '';
  let pendingQuantity = 1;

  for (const line of lines) {
    if (isFooter(line)) break;
    if (isNonItemLine(line)) continue;

    // Cafe POS: the first amount after @ is the unit price; the rightmost
    // amount is the extended line total and must never become the item name.
    const atUnitPrice = line.match(
      /^(.*?)\s*(\d{1,2})\s*[x×]\s*@\s*(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,})(?:\s+(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,}))?$/i,
    );
    if (atUnitPrice) {
      const name = atUnitPrice[1].trim() || pendingName;
      if (name) pushPrice(items, name, atUnitPrice[3], Number(atUnitPrice[2]));
      pendingName = '';
      pendingQuantity = 1;
      continue;
    }

    // Retail receipt row: product, quantity, unit price, extended total.
    // Accept it only when quantity × unit price agrees with the printed total.
    const retailRow = parseRetailRows(line);
    if (retailRow.length > 0) {
      for (const row of retailRow) {
        pushPrice(items, row.name, String(row.unitPrice), row.quantity, 1);
      }
      pendingName = '';
      pendingQuantity = 1;
      continue;
    }

    // Numbered menu name: "1. Es Kopi Lemon"
    const numberedName = line.match(/^\d{1,2}[.)]\s*([A-Za-zÀ-ÿ].+)$/);
    if (numberedName) {
      pendingName = numberedName[1].trim();
      pendingQuantity = 1;
      continue;
    }

    // "1 X Rp 12.000 Rp 12.000": use the first printed price, not the duplicate
    // right-aligned amount. Also supports qty-price lines without the Rp prefix.
    const quantityPrice = line.match(
      /^(\d{1,2})\s*[x×]\s*(?:@\s*)?(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,})(?:\s+(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,}))?$/i,
    );
    if (quantityPrice) {
      if (pendingName) pushPrice(items, pendingName, quantityPrice[2], Number(quantityPrice[1]));
      pendingName = '';
      pendingQuantity = 1;
      continue;
    }

    // OCR can split "1x @15.000" into separate "1x" and "@15.000" rows.
    // Keep quantity separate from the item name until its amount is read.
    const quantityOnly = line.match(/^(?:(.+?)\s+)?(\d{1,2})\s*[x×]$/i);
    if (quantityOnly) {
      const namePart = quantityOnly[1]?.trim();
      if (namePart) pendingName = pendingName ? `${pendingName} ${namePart}` : namePart;
      pendingQuantity = Number(quantityOnly[2]);
      continue;
    }

    // Item name and amount on one OCR row, including tabular receipt columns.
    const inlinePrice = line.match(
      /^(.*?)(?:\s+|@+\s*)(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,})\s*$/i,
    );
    if (inlinePrice) {
      const name = inlinePrice[1]
        .replace(/^\d{1,2}\s*[x×]\s*/i, '')
        .replace(/[@:]+/g, ' ')
        .trim();
      if (name) {
        pushPrice(items, name, inlinePrice[2]);
        pendingName = '';
        pendingQuantity = 1;
        continue;
      }
    }

    // Standalone price after an item name.
    const standalonePrice = line.match(
      /^(?:@\s*)?(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,})$/i,
    );
    if (standalonePrice) {
      if (pendingName) {
        pushPrice(items, pendingName, standalonePrice[1], pendingQuantity);
        pendingName = '';
        pendingQuantity = 1;
      }
      continue;
    }

    if (/[A-Za-zÀ-ÿ]/.test(line)) {
      const nameFragment = line
        .replace(/\s+\d{1,2}\s*[x×]\s*$/i, '')
        .replace(/[:]+/g, ' ')
        .trim();
      if (nameFragment) {
        pendingName = pendingName ? `${pendingName} ${nameFragment}` : nameFragment;
      }
    }
  }

  // Fallback for POS layouts that print all "@ unit price" values separately
  // from product names. Only use it if the sequential parser found no items.
  if (items.length === 0) {
    const prices: number[] = [];
    const names: string[] = [];
    for (const line of lines) {
      if (isFooter(line)) break;
      const atPrice = line.match(/@\s*(?:rp\s*)?((?:\d{1,3}(?:[.,]\s?\d{3})+)|\d{4,})/i);
      if (atPrice) prices.push(parseMoney(atPrice[1]));
      if (!isNonItemLine(line) && !isFooter(line) && /[A-Za-zÀ-ÿ]/.test(line) &&
        !/^(?:kasir|cashier)$/i.test(line) &&
        !/^(?:\d+\s*[x×]|subtotal|total|tax|pajak|service|payment)/i.test(line)) {
        const name = line.replace(/@\s*[\d.,]+/g, '').trim();
        if (name && !moneyPattern.test(name)) {
          if (/^(?:regular|small|medium|large)$/i.test(name) && names.length > 0) {
            names[names.length - 1] += ` ${name}`;
          } else {
            names.push(name);
          }
        }
      }
    }

    const count = Math.min(prices.length, names.length);
    for (let i = 0; i < count; i++) pushPrice(items, names[i], String(prices[i]));
  }

  return items;
};

export interface ParsedExtras {
  taxMode: 'nominal' | 'percent';
  taxPercent: number;
  taxNominal: number;
  serviceCharge: number;
  discount: number;
}

const extractAmounts = (line: string) => {
  const matches = line.match(/(?:rp\s*)?(?:\d{1,3}(?:[.,]\s?\d{3})+|\d{4,})/gi) ?? [];
  return matches.map(parseMoney).filter((amount) => amount > 0);
};

export const detectReceiptExtras = (ocrRawText: string, subtotal = 0): ParsedExtras => {
  const lines = normalizeReceiptText(ocrRawText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const labelAmount = (pattern: RegExp) => {
    const candidates: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!pattern.test(lines[i])) continue;
      const sameLine = extractAmounts(lines[i]);
      candidates.push(...sameLine);
      if (sameLine.length) continue;

      // Some thermal printers OCR labels and right-aligned values as adjacent rows.
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (isFooter(lines[j]) || /subtotal|grand total|total\b/i.test(lines[j])) break;
        const amounts = extractAmounts(lines[j]);
        candidates.push(...amounts);
        if (amounts.length) break;
      }
    }
    return candidates.length ? Math.max(...candidates) : 0;
  };

  let detectedSubtotal = subtotal;
  const subtotalAmount = labelAmount(/sub\s*total/i);
  if (subtotalAmount > 0) detectedSubtotal = subtotalAmount;

  const percentMatch = lines.join('\n').match(
    /\b(?:tax|pb1|ppn|pajak)\b[^\n%]{0,10}?(\d{1,2}(?:[.,]\d+)?)\s*%/i,
  );
  const taxPercent = percentMatch ? Number(percentMatch[1].replace(',', '.')) : 0;
  const hasTaxLabel = lines.some((line) => /(?:\btax\b|\bpb1\b|\bppn\b|\bpajak\b)/i.test(line));
  const combinedFee = labelAmount(/service\s*charge\s*&/i);
  let taxCandidate = labelAmount(/(?:\btax\b|\bpb1\b|\bppn\b|\bpajak\b)/i);
  let serviceCharge = labelAmount(/(?:service|layanan|servis|biaya\s*layanan)/i);
  const discount = labelAmount(/(?:disc(?:ount)?|diskon|promo|voucher|potongan|hemat)/i);

  // Many cafe receipts print a single "Service Charge &" amount and then a
  // separate "TAX" caption without another amount. Treat the combined amount
  // as the one extra charge, rather than losing it or counting it twice.
  if (combinedFee > 0 && hasTaxLabel) {
    taxCandidate = Math.max(taxCandidate, combinedFee);
    serviceCharge = 0;
  }

  // If the OCR separates all numeric columns from their labels, infer the
  // single tax/fee amount from grand total minus subtotal only when the
  // receipt explicitly has a tax label and no fee amount was read.
  if (
    hasTaxLabel &&
    taxPercent === 0 &&
    taxCandidate === 0 &&
    combinedFee === 0 &&
    serviceCharge === 0 &&
    discount === 0 &&
    detectedSubtotal > 0
  ) {
    const totals = lines.flatMap(extractAmounts)
      .filter((amount) => amount > detectedSubtotal && amount <= detectedSubtotal * 1.5)
      .sort((a, b) => a - b);
    if (totals.length > 0) {
      const inferredExtra = totals[0] - detectedSubtotal;
      const nearbyAmounts = lines.flatMap(extractAmounts)
        .filter((amount) =>
          amount > 0 &&
          amount < detectedSubtotal &&
          Math.abs(amount - inferredExtra) <= Math.max(100, inferredExtra * 0.03),
        )
        .sort((a, b) => Math.abs(a - inferredExtra) - Math.abs(b - inferredExtra));
      taxCandidate = nearbyAmounts[0] ?? inferredExtra;
    }
  }

  const validTax = taxPercent === 0 &&
    taxCandidate > 0 &&
    (detectedSubtotal === 0 ||
      (taxCandidate < detectedSubtotal &&
        taxCandidate / detectedSubtotal >= 0.025 &&
        taxCandidate / detectedSubtotal <= 0.2))
    ? taxCandidate
    : 0;

  return {
    taxMode: taxPercent > 0 ? 'percent' : 'nominal',
    taxPercent,
    taxNominal: validTax,
    serviceCharge: serviceCharge > 0 && serviceCharge < (detectedSubtotal || 10000000)
      ? serviceCharge
      : 0,
    discount: discount > 0 && discount < (detectedSubtotal || 10000000) ? discount : 0,
  };
};
