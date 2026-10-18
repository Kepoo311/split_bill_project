import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

interface PositionedLine {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ReceiptRow {
  top: number;
  bottom: number;
  lines: PositionedLine[];
}

const lineY = (line: PositionedLine) => line.top + line.height / 2;

/**
 * Reconstructs ML Kit lines into visual rows, then orders fragments left-to-right.
 * ML Kit's frame coordinates are optional and use top/left (not x/y).
 */
export const processReceiptOCR = (
  result: TextRecognitionResult,
  yTolerance = 14,
): string[] => {
  const positioned: PositionedLine[] = [];

  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const text = line.text.trim();
      if (!text) continue;

      const frame = line.frame;
      positioned.push({
        text,
        left: frame?.left ?? Number.MAX_SAFE_INTEGER,
        top: frame?.top ?? positioned.length * (yTolerance + 1),
        width: frame?.width ?? 0,
        height: frame?.height ?? 0,
      });
    }
  }

  positioned.sort((a, b) => a.top - b.top || a.left - b.left);

  const rows: ReceiptRow[] = [];
  for (const line of positioned) {
    const center = lineY(line);
    const row = rows.find((candidate) => {
      const overlap = Math.max(
        0,
        Math.min(candidate.bottom, line.top + line.height) -
          Math.max(candidate.top, line.top),
      );
      const minHeight = Math.min(
        Math.max(candidate.bottom - candidate.top, 1),
        Math.max(line.height, 1),
      );
      const centerDistance = Math.abs(center - (candidate.top + candidate.bottom) / 2);
      return overlap / minHeight >= 0.5 ||
        centerDistance <= Math.max(yTolerance, minHeight * 0.35);
    });

    if (row) {
      row.lines.push(line);
      row.top = Math.min(row.top, line.top);
      row.bottom = Math.max(row.bottom, line.top + line.height);
    } else {
      rows.push({
        top: line.top,
        bottom: line.top + line.height,
        lines: [line],
      });
    }
  }

  return rows
    .sort((a, b) => a.top - b.top)
    .map((row) =>
      row.lines
        .sort((a, b) => a.left - b.left)
        .map((line) => line.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
};
