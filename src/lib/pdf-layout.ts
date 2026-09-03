import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import * as fontkit from "fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Locale } from "@/lib/language-catalog";
import { createTranslator, type Translations, type Translator } from "@/lib/language-shared";

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
  khmerFont: PDFFont | null;
  khmerBold: PDFFont | null;
  locale: Locale;
  t: Translator;
};

const KHMER_FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSansKhmer.ttf");

/** Creates a document with Latin fonts and, when needed, embedded Khmer Unicode fonts. */
export async function createPdfCursor(locale: Locale = "en", translations: Translations = {}): Promise<Cursor> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let khmerFont: PDFFont | null = null;
  let khmerBold: PDFFont | null = null;
  if (locale === "km") {
    doc.registerFontkit(fontkit);
    const fontBytes = await readFile(KHMER_FONT_PATH);
    khmerFont = await doc.embedFont(fontBytes, { subset: false });
    khmerBold = khmerFont;
  }
  return {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
    font,
    bold,
    khmerFont,
    khmerBold,
    locale,
    t: createTranslator(locale, translations),
  };
}

const KHMER_RE = /[\u1780-\u17ff]/;

/**
 * Picks the font that can actually render `text`: the embedded Khmer face when
 * the string contains Khmer script (and that face was loaded for this
 * document), otherwise the standard Latin one.
 */
export function selectFont(cursor: Cursor, text: string, bold: boolean) {
  if (KHMER_RE.test(text) && cursor.khmerFont && cursor.khmerBold) {
    return bold ? cursor.khmerBold : cursor.khmerFont;
  }
  return bold ? cursor.bold : cursor.font;
}

/**
 * Makes text safe to draw with the standard Helvetica fonts, which can only
 * encode WinAnsi characters — anything outside it (e.g. Khmer text in a
 * document generated without the Khmer face) would otherwise throw while
 * saving. Common typographic punctuation is mapped to its ASCII equivalent;
 * anything still unsupported is dropped.
 */
export function winAnsiSafe(text: string, fallback = "-"): string {
  const normalized = text
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2007\u202F]/g, " ");
  const kept = Array.from(normalized)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return kept || fallback;
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const isKhmer = KHMER_RE.test(text);
  const words = isKhmer
    ? Array.from(new Intl.Segmenter("km", { granularity: "word" }).segment(text), ({ segment }) => segment)
    : text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current}${isKhmer ? "" : " "}${word}` : word;
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
  const font = selectFont(cursor, text, Boolean(opts.bold));
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
  const labelFont = selectFont(cursor, labelText, true);
  const valueText = value || "—";
  const valueFont = selectFont(cursor, valueText, false);
  const labelWidth = labelFont.widthOfTextAtSize(labelText, size);
  const valueLines = wrapText(valueText, valueFont, size, Math.max(60, width - labelWidth));

  ensureSpace(cursor, lineHeight);
  cursor.page.drawText(labelText, { x, y: cursor.y, size, font: labelFont, color: MUTED_COLOR });
  cursor.page.drawText(valueLines[0] ?? "—", {
    x: x + labelWidth,
    y: cursor.y,
    size,
    font: valueFont,
    color: TEXT_COLOR,
  });
  cursor.y -= lineHeight;

  for (let i = 1; i < valueLines.length; i++) {
    ensureSpace(cursor, lineHeight);
    cursor.page.drawText(valueLines[i], { x: x + labelWidth, y: cursor.y, size, font: valueFont, color: TEXT_COLOR });
    cursor.y -= lineHeight;
  }
}

export function formatDate(date: Date, locale: Locale = "en"): string {
  return date.toLocaleDateString(locale === "km" ? "km-KH" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** Draws a footer line (e.g. document id/date/page number) at a fixed position on every page. */
export function drawFooters(cursor: Cursor, label: string) {
  const pages = cursor.doc.getPages();
  pages.forEach((page, index) => {
    const text = `${label} · ${cursor.t("Page {current} of {total}", { current: index + 1, total: pages.length })}`;
    page.drawText(text, {
      x: MARGIN,
      y: 28,
      size: 7.5,
      font: selectFont(cursor, text, false),
      color: MUTED_COLOR,
    });
  });
}
