import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Shared low-level PDF layout primitives used by every generated document
 * (contract agreements, invoices, ...). Keeping this in one place means every
 * generated PDF automatically shares the same page size, margins, fonts and
 * text-flow behavior (page breaks, wrapping, labeled fields) without each
 * generator having to reimplement it.
 */

// A4 in points, with generous margins — this is meant to be printed, so it
// should look right on both A4 and US Letter without the content shifting.
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 50;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const TEXT_COLOR = rgb(0.12, 0.12, 0.16);
export const MUTED_COLOR = rgb(0.4, 0.42, 0.48);

export type Cursor = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
};

/** Creates a fresh document with Helvetica/Helvetica-Bold embedded and its first page ready to draw on. */
export async function createPdfCursor(): Promise<Cursor> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
    font,
    bold,
  };
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(attempt, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function newPage(cursor: Cursor) {
  cursor.page = cursor.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cursor.y = PAGE_HEIGHT - MARGIN;
}

export function ensureSpace(cursor: Cursor, needed: number) {
  if (cursor.y - needed < MARGIN + 15) {
    newPage(cursor);
  }
}

export function drawParagraph(
  cursor: Cursor,
  text: string,
  opts: { size?: number; bold?: boolean; center?: boolean; color?: ReturnType<typeof rgb>; gapAfter?: number } = {}
) {
  const size = opts.size ?? 10.5;
  const font = opts.bold ? cursor.bold : cursor.font;
  const lines = wrapText(text, font, size, CONTENT_WIDTH);
  const lineHeight = size * 1.4;
  for (const line of lines) {
    ensureSpace(cursor, lineHeight);
    const width = font.widthOfTextAtSize(line, size);
    const x = opts.center ? (PAGE_WIDTH - width) / 2 : MARGIN;
    cursor.page.drawText(line, { x, y: cursor.y, size, font, color: opts.color ?? TEXT_COLOR });
    cursor.y -= lineHeight;
  }
  cursor.y -= opts.gapAfter ?? 4;
}

export function drawSectionHeading(cursor: Cursor, text: string) {
  ensureSpace(cursor, 30);
  cursor.y -= 8;
  drawParagraph(cursor, text, { size: 12, bold: true, gapAfter: 6 });
}

/** Draws a bold `Label: ` followed by a (possibly wrapped) value, starting at the left margin. */
export function drawField(cursor: Cursor, label: string, value: string, opts: { x?: number; width?: number } = {}) {
  const size = 10;
  const lineHeight = size * 1.45;
  const x = opts.x ?? MARGIN;
  const width = opts.width ?? CONTENT_WIDTH;
  const labelText = `${label}: `;
  const labelWidth = cursor.bold.widthOfTextAtSize(labelText, size);
  const valueLines = wrapText(value || "—", cursor.font, size, Math.max(60, width - labelWidth));

  ensureSpace(cursor, lineHeight);
  cursor.page.drawText(labelText, { x, y: cursor.y, size, font: cursor.bold, color: MUTED_COLOR });
  cursor.page.drawText(valueLines[0] ?? "—", {
    x: x + labelWidth,
    y: cursor.y,
    size,
    font: cursor.font,
    color: TEXT_COLOR,
  });
  cursor.y -= lineHeight;

  for (let i = 1; i < valueLines.length; i++) {
    ensureSpace(cursor, lineHeight);
    cursor.page.drawText(valueLines[i], { x: x + labelWidth, y: cursor.y, size, font: cursor.font, color: TEXT_COLOR });
    cursor.y -= lineHeight;
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** Draws a footer line (e.g. document id/date/page number) at a fixed position on every page. */
export function drawFooters(cursor: Cursor, label: string) {
  const pages = cursor.doc.getPages();
  pages.forEach((page, index) => {
    page.drawText(`${label} · Page ${index + 1} of ${pages.length}`, {
      x: MARGIN,
      y: 28,
      size: 7.5,
      font: cursor.font,
      color: MUTED_COLOR,
    });
  });
}
