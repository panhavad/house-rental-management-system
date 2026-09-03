import { rgb } from "pdf-lib";
import { formatMoney, type AppSettings } from "@/lib/currency";
import {
  MARGIN,
  CONTENT_WIDTH,
  MUTED_COLOR,
  TEXT_COLOR,
  type Cursor,
  createPdfCursor,
  ensureSpace,
  drawParagraph,
  drawSectionHeading,
  drawField,
  formatDate,
  drawFooters,
} from "@/lib/pdf-layout";
import type { Locale } from "@/lib/language-catalog";
import type { Translations } from "@/lib/language-shared";
import { contractFixedUtilityFees } from "@/lib/utility-billing";

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
    /** Flat monthly utility pricing; a null fee means that utility is billed by meter usage. */
    fixedUtilityEnabled: boolean;
    fixedWaterFee: number | null;
    fixedElectricityFee: number | null;
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
  locale: Locale;
  translations: Translations;
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
  { token: "waterCharge", label: "How water is charged (fixed price, or billed by meter)" },
  { token: "electricityCharge", label: "How electricity is charged (fixed price, or billed by meter)" },
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
Water charge: {{waterCharge}}
Electricity charge: {{electricityCharge}}
A utility agreed at a fixed monthly price is charged at that flat amount regardless of usage. Any other utility is billed separately based on actual meter readings at the utility rates in effect for that month. Utility charges are due together with the monthly rent.

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

/** Human-readable billing terms for one utility, used in the agreement's Utilities section. */
function describeUtilityCharge(fixedFee: number | null, settings: AppSettings): string {
  return fixedFee !== null
    ? `${formatMoney(fixedFee, settings)} per month (fixed / pre-paid)`
    : "Billed by meter usage at the rate in effect for the month";
}

/** Builds the `{{placeholder}}` -> value map for one contract from everything entered on the form. */
export function buildContractTemplateContext(data: ContractPdfData): Record<string, string> {
  const fixedFees = contractFixedUtilityFees(data.contract);
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
    startDate: formatDate(data.contract.startDate, data.locale),
    endDate: formatDate(data.contract.endDate, data.locale),
    rentalFee: formatMoney(data.contract.rentalFee, data.settings),
    deposit: formatMoney(data.contract.deposit, data.settings),
    waterMeterStart: `${data.contract.waterMeterStart} units`,
    electricityMeterStart: `${data.contract.electricityMeterStart} units`,
    waterCharge: describeUtilityCharge(fixedFees.water, data.settings),
    electricityCharge: describeUtilityCharge(fixedFees.electricity, data.settings),
    notes: data.contract.notes ?? "",
    contractId: data.contract.id ?? "Draft (not yet started)",
    generatedDate: formatDate(data.generatedAt, data.locale),
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

function drawSignatureBlock(cursor: Cursor, heading: string, printedName: string) {
  const columnWidth = (CONTENT_WIDTH - 24) / 2;
  const isLeft = heading === "LANDLORD / PROPERTY MANAGER";
  const x = isLeft ? MARGIN : MARGIN + columnWidth + 24;

  const translatedHeading = cursor.t(heading);
  const headingFont = cursor.locale === "km" && cursor.khmerBold ? cursor.khmerBold : cursor.bold;
  const textFont = cursor.locale === "km" && cursor.khmerFont ? cursor.khmerFont : cursor.font;
  cursor.page.drawText(translatedHeading, { x, y: cursor.y, size: 9.5, font: headingFont, color: MUTED_COLOR });
  cursor.page.drawLine({
    start: { x, y: cursor.y - 32 },
    end: { x: x + columnWidth, y: cursor.y - 32 },
    thickness: 0.75,
    color: MUTED_COLOR,
  });
  cursor.page.drawText(cursor.t("Signature"), { x, y: cursor.y - 44, size: 8.5, font: textFont, color: MUTED_COLOR });
  cursor.page.drawText(cursor.t("Printed name: {name}", { name: printedName }), {
    x,
    y: cursor.y - 60,
    size: 9.5,
    font: textFont,
    color: TEXT_COLOR,
  });
  cursor.page.drawText(cursor.t("Date: _______________________"), {
    x,
    y: cursor.y - 76,
    size: 9.5,
    font: textFont,
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
  const cursor = await createPdfCursor(data.locale, data.translations);

  const context = buildContractTemplateContext(data);
  const parsed = parseContractTemplate(templateContent?.trim() ? templateContent : DEFAULT_CONTRACT_TEMPLATE);
  const title = cursor.t(parsed.title || "RESIDENTIAL RENTAL AGREEMENT");

  if (data.isPreview) {
    drawParagraph(cursor, cursor.t("PREVIEW — this contract has not been started yet"), {
      size: 9.5,
      bold: true,
      center: true,
      color: PREVIEW_COLOR,
      gapAfter: 8,
    });
  }

  drawParagraph(cursor, title, { size: 18, bold: true, center: true, gapAfter: 4 });
  drawParagraph(cursor, data.workspaceName, { size: 11, center: true, color: MUTED_COLOR, gapAfter: 2 });
  drawParagraph(cursor, cursor.t("Prepared on {date}", { date: formatDate(data.generatedAt, data.locale) }), {
    size: 9,
    center: true,
    color: MUTED_COLOR,
    gapAfter: 14,
  });

  for (const node of renderLinesToNodes(parsed.introLines, context)) {
    if (node.type === "paragraph") {
      drawParagraph(cursor, cursor.t(node.text), { size: 8.5, color: MUTED_COLOR, gapAfter: 10 });
    } else {
      drawField(cursor, cursor.t(node.label), node.value);
    }
  }

  let sectionNumber = 0;
  for (const section of parsed.sections) {
    const nodes = renderLinesToNodes(section.lines, context);
    if (nodes.length === 0) continue; // e.g. Additional Notes with no notes entered
    sectionNumber++;
    drawSectionHeading(cursor, `${sectionNumber}. ${cursor.t(section.heading)}`);
    for (const node of nodes) {
      if (node.type === "field") {
        drawField(cursor, cursor.t(node.label), node.value);
      } else {
        drawParagraph(cursor, cursor.t(node.text), { gapAfter: 8 });
      }
    }
  }
  cursor.y -= 12;

  ensureSpace(cursor, 90);
  drawSignatureBlock(cursor, "LANDLORD / PROPERTY MANAGER", data.preparedByName);
  drawSignatureBlock(cursor, "TENANT", data.contract.tenantName);
  cursor.y -= 90;

  const footerLabel = data.isPreview ? cursor.t("Draft preview") : cursor.t("Contract {id}", { id: data.contract.id ?? "" });
  drawFooters(cursor, `${footerLabel} · ${cursor.t("Generated {date}", { date: formatDate(data.generatedAt, data.locale) })}`);

  return cursor.doc.save();
}
