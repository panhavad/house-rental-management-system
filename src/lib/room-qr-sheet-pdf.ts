import { rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
  TEXT_COLOR,
  MUTED_COLOR,
  createPdfCursor,
  selectFont,
  winAnsiSafe,
  formatDate,
  type Cursor,
} from "@/lib/pdf-layout";
import type { Locale } from "@/lib/language-catalog";
import type { Translations } from "@/lib/language-shared";

/**
 * Builds a print-ready A4 sheet of utility-reading QR codes — one card per
 * room, laid out in a cut-along-the-line grid. Each card carries the apartment
 * name, room number and address so a printed stack can be sorted and posted in
 * the right rooms without scanning them first.
 */

export type RoomQrCard = {
  apartmentName: string;
  roomName: string;
  address: string | null;
  /** PNG bytes of the QR code that deep-links to this room's reading form. */
  qrPngBytes: Uint8Array;
};

export type RoomQrSheetData = {
  workspaceName: string;
  /** Describes what the sheet covers, e.g. "Sunrise Residence · 12 rooms". */
  scopeLabel: string;
  cards: RoomQrCard[];
  generatedAt: Date;
  locale?: Locale;
  translations?: Translations;
};

const COLUMNS = 2;
const ROWS = 3;
const GUTTER = 18;
const CARD_PADDING = 12;
const HEADER_HEIGHT = 54;
const GRID_TOP = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT;
const GRID_BOTTOM = MARGIN + 20; // Leaves room for the page footer line.
const CARD_WIDTH = (CONTENT_WIDTH - GUTTER * (COLUMNS - 1)) / COLUMNS;
const CARD_HEIGHT = (GRID_TOP - GRID_BOTTOM - GUTTER * (ROWS - 1)) / ROWS;
const BORDER_COLOR = rgb(0.78, 0.8, 0.84);

const KHMER_RE = /[\u1780-\u17ff]/;

/** A piece of text paired with a font that can actually render it. */
type Run = { text: string; font: PDFFont };

/**
 * Splits text at script boundaries so each piece is drawn with a font that
 * covers it. This matters on every card: the bundled Khmer face has no Latin
 * glyphs, so a mixed string like "អគារ សុវណ្ណា · A-101" drawn with a single
 * font would silently lose half of itself. Latin pieces are additionally
 * reduced to what the standard fonts can encode.
 */
function toRuns(cursor: Cursor, text: string, bold: boolean): Run[] {
  const runs: Run[] = [];
  for (const part of text.split(/([\u1780-\u17ff\u200b]+)/)) {
    if (!part) continue;
    const font = selectFont(cursor, part, bold);
    const isUnicodeFace = font === cursor.khmerFont || font === cursor.khmerBold;
    const safe = isUnicodeFace ? part : winAnsiSafe(part, "");
    if (safe) runs.push({ text: safe, font });
  }
  return runs;
}

/** Breaks runs into the smallest pieces a line may end on: words for Latin, cluster-aware segments for Khmer. */
function tokenize(cursor: Cursor, text: string, bold: boolean): Run[] {
  const tokens: Run[] = [];
  for (const run of toRuns(cursor, text, bold)) {
    const pieces = KHMER_RE.test(run.text)
      ? Array.from(new Intl.Segmenter("km", { granularity: "word" }).segment(run.text), ({ segment }) => segment)
      : run.text.split(/(\s+)/);
    for (const piece of pieces) {
      if (piece) tokens.push({ text: piece, font: run.font });
    }
  }
  return tokens;
}

function runsWidth(runs: Run[], size: number): number {
  return runs.reduce((total, run) => total + run.font.widthOfTextAtSize(run.text, size), 0);
}

function trimTrailingSpace(line: Run[]): Run[] {
  while (line.length > 0 && /^\s+$/.test(line[line.length - 1].text)) line.pop();
  return line;
}

/** Greedy line breaker that keeps each line's mixed-script runs together. */
function wrapRuns(tokens: Run[], size: number, maxWidth: number): Run[][] {
  const lines: Run[][] = [];
  let line: Run[] = [];
  let width = 0;

  for (const token of tokens) {
    const isSpace = /^\s+$/.test(token.text);
    const tokenWidth = token.font.widthOfTextAtSize(token.text, size);
    if (line.length > 0 && !isSpace && width + tokenWidth > maxWidth) {
      lines.push(trimTrailingSpace(line));
      line = [];
      width = 0;
    }
    if (line.length === 0 && isSpace) continue;
    line.push(token);
    width += tokenWidth;
  }
  if (line.length > 0) lines.push(trimTrailingSpace(line));
  return lines;
}

function drawRuns(page: PDFPage, runs: Run[], opts: { x: number; y: number; size: number; color: ReturnType<typeof rgb> }) {
  let x = opts.x;
  for (const run of runs) {
    page.drawText(run.text, { x, y: opts.y, size: opts.size, font: run.font, color: opts.color });
    x += run.font.widthOfTextAtSize(run.text, opts.size);
  }
}

/**
 * Draws text wrapped to `width` and horizontally centered on `centerX`,
 * returning the y just below the block. Lines beyond `maxLines` are dropped so
 * a long address can never spill out of its card.
 */
function drawCenteredText(
  cursor: Cursor,
  page: PDFPage,
  text: string,
  opts: {
    centerX: number;
    top: number;
    width: number;
    size: number;
    bold?: boolean;
    color: ReturnType<typeof rgb>;
    maxLines: number;
  }
): number {
  const lines = wrapRuns(tokenize(cursor, text, Boolean(opts.bold)), opts.size, opts.width).slice(0, opts.maxLines);
  const lineHeight = opts.size * 1.3;
  let y = opts.top;
  for (const line of lines) {
    drawRuns(page, line, {
      x: opts.centerX - runsWidth(line, opts.size) / 2,
      y: y - opts.size,
      size: opts.size,
      color: opts.color,
    });
    y -= lineHeight;
  }
  return y;
}

function drawSheetHeader(cursor: Cursor, page: PDFPage, data: RoomQrSheetData) {
  drawRuns(page, toRuns(cursor, cursor.t("Utility reading QR codes"), true), {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 14,
    size: 15,
    color: TEXT_COLOR,
  });
  drawRuns(page, toRuns(cursor, `${data.workspaceName} · ${data.scopeLabel}`, false), {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 30,
    size: 9,
    color: MUTED_COLOR,
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 40 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 40 },
    thickness: 0.7,
    color: BORDER_COLOR,
  });
}

function drawCard(cursor: Cursor, page: PDFPage, card: RoomQrCard, qrImage: PDFImage, origin: { x: number; top: number }) {
  page.drawRectangle({
    x: origin.x,
    y: origin.top - CARD_HEIGHT,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderWidth: 0.7,
    borderColor: BORDER_COLOR,
  });

  const centerX = origin.x + CARD_WIDTH / 2;
  const width = CARD_WIDTH - CARD_PADDING * 2;
  let y = origin.top - CARD_PADDING;

  y = drawCenteredText(cursor, page, card.roomName, {
    centerX,
    top: y,
    width,
    size: 14,
    bold: true,
    color: TEXT_COLOR,
    maxLines: 2,
  });
  y = drawCenteredText(cursor, page, card.apartmentName, {
    centerX,
    top: y - 1,
    width,
    size: 9.5,
    color: TEXT_COLOR,
    maxLines: 2,
  });
  if (card.address) {
    y = drawCenteredText(cursor, page, card.address, {
      centerX,
      top: y,
      width,
      size: 7.5,
      color: MUTED_COLOR,
      maxLines: 2,
    });
  }

  // Whatever vertical space the labels didn't use goes to the QR code, so a
  // long address shrinks the code instead of overflowing the card.
  const captionHeight = 14;
  const available = y - (origin.top - CARD_HEIGHT) - CARD_PADDING - captionHeight;
  const qrSize = Math.max(60, Math.min(width, available));
  const qrTop = y - Math.max(0, (available - qrSize) / 2) - 2;
  page.drawImage(qrImage, { x: centerX - qrSize / 2, y: qrTop - qrSize, width: qrSize, height: qrSize });

  drawCenteredText(cursor, page, cursor.t("Scan to record this room's meter reading"), {
    centerX,
    top: qrTop - qrSize - 3,
    width,
    size: 7,
    color: MUTED_COLOR,
    maxLines: 1,
  });
}

/** Footer on every page: who generated the sheet, when, and the page number. */
function drawSheetFooters(cursor: Cursor, data: RoomQrSheetData) {
  const pages = cursor.doc.getPages();
  const generated = cursor.t("Generated {date}", { date: formatDate(data.generatedAt, cursor.locale) });
  pages.forEach((page, index) => {
    const label = `${data.workspaceName} · ${generated} · ${cursor.t("Page {current} of {total}", {
      current: index + 1,
      total: pages.length,
    })}`;
    drawRuns(page, toRuns(cursor, label, false), { x: MARGIN, y: 28, size: 7.5, color: MUTED_COLOR });
  });
}

export async function generateRoomQrSheetPdf(data: RoomQrSheetData): Promise<Uint8Array> {
  const cursor = await createPdfCursor(data.locale ?? "en", data.translations ?? {});
  const perPage = COLUMNS * ROWS;
  const images = await Promise.all(data.cards.map((card) => cursor.doc.embedPng(card.qrPngBytes)));

  let page = cursor.page;
  for (let index = 0; index < data.cards.length; index++) {
    const slot = index % perPage;
    if (slot === 0) {
      // `createPdfCursor` already opened the first page, so only add one after it.
      if (index > 0) page = cursor.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawSheetHeader(cursor, page, data);
    }
    drawCard(cursor, page, data.cards[index], images[index], {
      x: MARGIN + (slot % COLUMNS) * (CARD_WIDTH + GUTTER),
      top: GRID_TOP - Math.floor(slot / COLUMNS) * (CARD_HEIGHT + GUTTER),
    });
  }

  drawSheetFooters(cursor, data);
  return cursor.doc.save();
}
