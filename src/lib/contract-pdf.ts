import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatMoney, type AppSettings } from "@/lib/currency";

// A4 in points, with generous margins — this is meant to be printed, so it
// should look right on both A4 and US Letter without the content shifting.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT_COLOR = rgb(0.12, 0.12, 0.16);
const MUTED_COLOR = rgb(0.4, 0.42, 0.48);
const PREVIEW_COLOR = rgb(0.7, 0.35, 0.05);

export type ContractPdfData = {
  contract: {
    /** Null while previewing a contract that hasn't been created yet. */
    id: string | null;
    tenantName: string;
    tenantPhone: string | null;
    tenantEmail: string | null;
    tenantIdNumber: string | null;
    occupants: number;
    rentalFee: number;
    deposit: number;
    /** Meter readings captured at move-in — the baseline for this tenancy's first utility bill. */
    waterMeterStart: number;
    electricityMeterStart: number;
    startDate: Date;
    endDate: Date;
    notes: string | null;
  };
  room: {
    name: string;
    type: string;
    size: number | null;
    floor: string | null;
  };
  apartment: {
    name: string;
    address: string | null;
  };
  workspaceName: string;
  facilityNames: string[];
  settings: AppSettings;
  /** Whoever started the contract in the system — printed as the Landlord's representative. */
  preparedByName: string;
  generatedAt: Date;
  /** True while drafting/previewing a contract that hasn't actually been started yet. */
  isPreview?: boolean;
};

/**
 * Placeholders available inside a contract template's `{{token}}` markers,
 * shown to the user in the template editor as a quick reference.
 */
export const CONTRACT_TEMPLATE_PLACEHOLDERS: { token: string; label: string }[] = [
  { token: "workspaceName", label: "Workspace / landlord name" },
  { token: "preparedByName", label: "Staff member starting the contract" },
  { token: "tenantName", label: "Tenant's full name" },
  { token: "tenantPhone", label: "Tenant's phone number" },
  { token: "tenantEmail", label: "Tenant's email address" },
  { token: "tenantIdNumber", label: "Tenant's ID/passport number" },
  { token: "occupants", label: "Number of people staying" },
  { token: "apartmentName", label: "Apartment/building name" },
  { token: "apartmentAddress", label: "Apartment/building address" },
  { token: "roomName", label: "Room name/number" },
  { token: "roomType", label: "Room type (e.g. Studio, 1 Bedroom)" },
  { token: "roomFloor", label: "Room floor" },
  { token: "roomSize", label: "Room size (e.g. \"35 m²\")" },
  { token: "facilities", label: "Comma-separated list of room facilities" },
  { token: "startDate", label: "Lease start date" },
  { token: "endDate", label: "Lease end date" },
  { token: "rentalFee", label: "Monthly rent, formatted in the workspace currency" },
  { token: "deposit", label: "Security deposit, formatted in the workspace currency" },
  { token: "waterMeterStart", label: "Water meter reading at move-in" },
  { token: "electricityMeterStart", label: "Electricity meter reading at move-in" },
  { token: "notes", label: "Additional notes entered on the contract" },
  { token: "contractId", label: "Contract ID (or \"Draft\" while previewing)" },
  { token: "generatedDate", label: "Date the document was generated" },
];

/**
 * The built-in lease template. Workspaces can override this from
 * Settings → Contract template; an empty/missing override falls back to this.
 *
 * Format:
 * - An optional leading `# Title` line overrides the document title.
 * - Everything before the first `## Heading` is the intro paragraph(s).
 * - `## Heading` starts a new section, auto-numbered in the order it's
 *   actually rendered (a section with no visible content — e.g. Additional
 *   Notes when no notes were entered — is silently omitted, and later
 *   sections renumber accordingly).
 * - A line shaped like `Label: value` (value may contain `{{placeholders}}`)
 *   renders as a bold-label field row, and is dropped entirely if its value
 *   resolves to nothing. Any other line is flowing paragraph text; a blank
 *   line starts a new paragraph.
 */
export const DEFAULT_CONTRACT_TEMPLATE = `# RESIDENTIAL RENTAL AGREEMENT

This is a general lease template generated from the details entered in RentalHRM. It does not constitute legal advice — review it (and local rental regulations) before relying on it.

## Parties
Landlord: {{workspaceName}}, represented by {{preparedByName}} ("the Landlord")
Tenant: {{tenantName}} ("the Tenant")
Tenant phone: {{tenantPhone}}
Tenant email: {{tenantEmail}}
Tenant ID number: {{tenantIdNumber}}
Number of occupants: {{occupants}}

## Property
Apartment: {{apartmentName}}
Address: {{apartmentAddress}}
Room: {{roomName}} ({{roomType}})
Floor: {{roomFloor}}
Size: {{roomSize}}
Facilities included: {{facilities}}

## Lease Term
Start date: {{startDate}}
End date: {{endDate}}

## Rent & Deposit
Monthly rent: {{rentalFee}}
Security deposit: {{deposit}}
Rent is due in full on or before the last day of each calendar month. The security deposit is refundable at the end of the lease, less any deductions for unpaid rent, unpaid utility charges, or damage beyond normal wear and tear.

## Utilities
Water meter reading at move-in: {{waterMeterStart}}
Electricity meter reading at move-in: {{electricityMeterStart}}
Water and electricity are billed separately based on actual meter readings at the utility rates in effect for that month, and are due together with the monthly rent.

## Use of Premises
The property is to be used solely as a private residence for the Tenant and the occupants named above. The Tenant may not sublet, assign, or use the premises for any unlawful purpose without the Landlord's prior written consent.

## Maintenance & Repairs
The Tenant agrees to keep the premises clean and to promptly notify the Landlord of any damage or needed repairs. The Landlord is responsible for maintaining the property in good, habitable condition; the Tenant is responsible for damage caused by their own negligence or misuse.

## Termination
Either party may end this agreement at the end of the lease term by giving written notice at least 30 days in advance. Early termination outside the agreed term, or breach of this agreement, may result in forfeiture of some or all of the security deposit as compensation to the Landlord.

## Additional Notes
{{notes}}

## Governing Terms
This agreement is governed by the applicable laws of the jurisdiction in which the property is located. By signing below, both parties acknowledge that they have read, understood, and agree to all terms of this agreement.
`;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** Builds the `{{placeholder}}` -> value map for one contract from everything entered on the form. */
export function buildContractTemplateContext(data: ContractPdfData): Record<string, string> {
  return {
    workspaceName: data.workspaceName,
    preparedByName: data.preparedByName,
    tenantName: data.contract.tenantName,
    tenantPhone: data.contract.tenantPhone ?? "",
    tenantEmail: data.contract.tenantEmail ?? "",
    tenantIdNumber: data.contract.tenantIdNumber ?? "",
    occupants: String(data.contract.occupants),
    apartmentName: data.apartment.name,
    apartmentAddress: data.apartment.address ?? "",
    roomName: data.room.name,
    roomType: data.room.type,
    roomFloor: data.room.floor ?? "",
    roomSize: data.room.size ? `${data.room.size} m²` : "",
    facilities: data.facilityNames.join(", "),
    startDate: formatDate(data.contract.startDate),
    endDate: formatDate(data.contract.endDate),
    rentalFee: formatMoney(data.contract.rentalFee, data.settings),
    deposit: formatMoney(data.contract.deposit, data.settings),
    waterMeterStart: `${data.contract.waterMeterStart} units`,
    electricityMeterStart: `${data.contract.electricityMeterStart} units`,
    notes: data.contract.notes ?? "",
    contractId: data.contract.id ?? "Draft (not yet started)",
    generatedDate: formatDate(data.generatedAt),
  };
}

// ---------------------------------------------------------------------------
// Template parsing & rendering
// ---------------------------------------------------------------------------

type TemplateNode = { type: "field"; label: string; value: string } | { type: "paragraph"; text: string };

type ParsedTemplate = {
  title: string | null;
  introLines: string[];
  sections: { heading: string; lines: string[] }[];
};

const FIELD_LINE_RE = /^([A-Za-z][A-Za-z0-9 ()/&'".-]{0,48}):\s+(.+)$/;
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function substitutePlaceholders(text: string, context: Record<string, string>): string {
  return text.replace(PLACEHOLDER_RE, (_match, key: string) => context[key] ?? "");
}

/** Parses the `# Title` / `## Heading` / plain-text template markup described above `DEFAULT_CONTRACT_TEMPLATE`. */
function parseContractTemplate(raw: string): ParsedTemplate {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  let title: string | null = null;
  if (lines[0]?.trim().startsWith("# ")) {
    title = lines[0].trim().slice(2).trim();
    i = 1;
  }

  const introLines: string[] = [];
  while (i < lines.length && !lines[i].trim().startsWith("## ")) {
    introLines.push(lines[i]);
    i++;
  }

  const sections: { heading: string; lines: string[] }[] = [];
  while (i < lines.length) {
    const heading = lines[i].trim().slice(3).trim();
    i++;
    const bodyLines: string[] = [];
    while (i < lines.length && !lines[i].trim().startsWith("## ")) {
      bodyLines.push(lines[i]);
      i++;
    }
    sections.push({ heading, lines: bodyLines });
  }

  return { title, introLines, sections };
}

/**
 * Turns a block of raw template lines into renderable nodes: `Label: value`
 * lines become bold-label fields (dropped if the value resolves to nothing),
 * everything else flows into paragraphs split on blank lines. A block that
 * resolves to zero nodes (e.g. a Notes section when no notes were entered)
 * lets the caller omit the whole section, headings included.
 */
function renderLinesToNodes(rawLines: string[], context: Record<string, string>): TemplateNode[] {
  const nodes: TemplateNode[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(" ").trim();
      if (text) nodes.push({ type: "paragraph", text });
      paragraphBuffer = [];
    }
  };

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    const fieldMatch = trimmed.match(FIELD_LINE_RE);
    if (fieldMatch) {
      flushParagraph();
      const value = substitutePlaceholders(fieldMatch[2], context).trim();
      if (value) nodes.push({ type: "field", label: fieldMatch[1], value });
      continue;
    }

    const substituted = substitutePlaceholders(trimmed, context);
    if (substituted.trim() === "") continue;
    paragraphBuffer.push(substituted);
  }
  flushParagraph();

  return nodes;
}

// ---------------------------------------------------------------------------
// PDF drawing
// ---------------------------------------------------------------------------

type Cursor = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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

function newPage(cursor: Cursor) {
  cursor.page = cursor.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cursor.y = PAGE_HEIGHT - MARGIN;
}

function ensureSpace(cursor: Cursor, needed: number) {
  if (cursor.y - needed < MARGIN + 15) {
    newPage(cursor);
  }
}

function drawParagraph(
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

function drawSectionHeading(cursor: Cursor, text: string) {
  ensureSpace(cursor, 30);
  cursor.y -= 8;
  drawParagraph(cursor, text, { size: 12, bold: true, gapAfter: 6 });
}

function drawField(cursor: Cursor, label: string, value: string) {
  const size = 10;
  const lineHeight = size * 1.45;
  const labelText = `${label}: `;
  const labelWidth = cursor.bold.widthOfTextAtSize(labelText, size);
  const valueLines = wrapText(value || "—", cursor.font, size, Math.max(60, CONTENT_WIDTH - labelWidth));

  ensureSpace(cursor, lineHeight);
  cursor.page.drawText(labelText, { x: MARGIN, y: cursor.y, size, font: cursor.bold, color: MUTED_COLOR });
  cursor.page.drawText(valueLines[0] ?? "—", {
    x: MARGIN + labelWidth,
    y: cursor.y,
    size,
    font: cursor.font,
    color: TEXT_COLOR,
  });
  cursor.y -= lineHeight;

  for (let i = 1; i < valueLines.length; i++) {
    ensureSpace(cursor, lineHeight);
    cursor.page.drawText(valueLines[i], { x: MARGIN + labelWidth, y: cursor.y, size, font: cursor.font, color: TEXT_COLOR });
    cursor.y -= lineHeight;
  }
}

function drawSignatureBlock(cursor: Cursor, heading: string, printedName: string) {
  const columnWidth = (CONTENT_WIDTH - 24) / 2;
  const isLeft = heading === "LANDLORD / PROPERTY MANAGER";
  const x = isLeft ? MARGIN : MARGIN + columnWidth + 24;

  cursor.page.drawText(heading, { x, y: cursor.y, size: 9.5, font: cursor.bold, color: MUTED_COLOR });
  cursor.page.drawLine({
    start: { x, y: cursor.y - 32 },
    end: { x: x + columnWidth, y: cursor.y - 32 },
    thickness: 0.75,
    color: MUTED_COLOR,
  });
  cursor.page.drawText("Signature", { x, y: cursor.y - 44, size: 8.5, font: cursor.font, color: MUTED_COLOR });
  cursor.page.drawText(`Printed name: ${printedName}`, {
    x,
    y: cursor.y - 60,
    size: 9.5,
    font: cursor.font,
    color: TEXT_COLOR,
  });
  cursor.page.drawText("Date: _______________________", {
    x,
    y: cursor.y - 76,
    size: 9.5,
    font: cursor.font,
    color: TEXT_COLOR,
  });
}

/**
 * Builds a print-ready rental agreement PDF from everything captured on the
 * "Start contract" form — tenant details, room/apartment info, rent/deposit,
 * lease term and facilities — rendered through the workspace's contract
 * template (or `DEFAULT_CONTRACT_TEMPLATE` if none/blank is given), ending in
 * signature blocks for the landlord/property manager and the tenant.
 * Returned as raw bytes ready to write to disk or stream to the browser.
 */
export async function generateContractAgreementPdf(data: ContractPdfData, templateContent?: string | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const cursor: Cursor = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
    font,
    bold,
  };

  const context = buildContractTemplateContext(data);
  const parsed = parseContractTemplate(templateContent?.trim() ? templateContent : DEFAULT_CONTRACT_TEMPLATE);
  const title = parsed.title || "RESIDENTIAL RENTAL AGREEMENT";

  if (data.isPreview) {
    drawParagraph(cursor, "PREVIEW — this contract has not been started yet", {
      size: 9.5,
      bold: true,
      center: true,
      color: PREVIEW_COLOR,
      gapAfter: 8,
    });
  }

  drawParagraph(cursor, title, { size: 18, bold: true, center: true, gapAfter: 4 });
  drawParagraph(cursor, data.workspaceName, { size: 11, center: true, color: MUTED_COLOR, gapAfter: 2 });
  drawParagraph(cursor, `Prepared on ${formatDate(data.generatedAt)}`, {
    size: 9,
    center: true,
    color: MUTED_COLOR,
    gapAfter: 14,
  });

  for (const node of renderLinesToNodes(parsed.introLines, context)) {
    if (node.type === "paragraph") {
      drawParagraph(cursor, node.text, { size: 8.5, color: MUTED_COLOR, gapAfter: 10 });
    } else {
      drawField(cursor, node.label, node.value);
    }
  }

  let sectionNumber = 0;
  for (const section of parsed.sections) {
    const nodes = renderLinesToNodes(section.lines, context);
    if (nodes.length === 0) continue; // e.g. Additional Notes with no notes entered
    sectionNumber++;
    drawSectionHeading(cursor, `${sectionNumber}. ${section.heading}`);
    for (const node of nodes) {
      if (node.type === "field") {
        drawField(cursor, node.label, node.value);
      } else {
        drawParagraph(cursor, node.text, { gapAfter: 8 });
      }
    }
  }
  cursor.y -= 12;

  ensureSpace(cursor, 90);
  drawSignatureBlock(cursor, "LANDLORD / PROPERTY MANAGER", data.preparedByName);
  drawSignatureBlock(cursor, "TENANT", data.contract.tenantName);
  cursor.y -= 90;

  const pages = doc.getPages();
  const footerLabel = data.isPreview ? "Draft preview" : `Contract ${data.contract.id}`;
  pages.forEach((page, index) => {
    page.drawText(`${footerLabel} · Generated ${formatDate(data.generatedAt)} · Page ${index + 1} of ${pages.length}`, {
      x: MARGIN,
      y: 28,
      size: 7.5,
      font,
      color: MUTED_COLOR,
    });
  });

  return doc.save();
}
