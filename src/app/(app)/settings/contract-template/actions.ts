"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { getAppSettings } from "@/lib/currency";
import { generateContractAgreementPdf, type ContractPdfData } from "@/lib/contract-pdf";
import { saveWorkspaceContractTemplate, resetWorkspaceContractTemplate } from "@/lib/contract-template";

export async function updateContractTemplate(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const content = String(formData.get("content") ?? "");

  if (content.trim()) {
    await saveWorkspaceContractTemplate(user.workspaceId, content);
  } else {
    // Saving a blank template just reverts to the built-in default.
    await resetWorkspaceContractTemplate(user.workspaceId);
  }

  revalidatePath("/settings/contract-template");
}

export async function resetContractTemplate() {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  await resetWorkspaceContractTemplate(user.workspaceId);
  revalidatePath("/settings/contract-template");
}

/** Sample data used so the template can be previewed without a real room/contract to point it at. */
function buildSampleContractData(workspaceName: string, preparedByName: string, settings: ContractPdfData["settings"]): ContractPdfData {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    contract: {
      id: null,
      tenantName: "Jane Doe",
      tenantPhone: "012 345 678",
      tenantEmail: "jane.doe@example.com",
      tenantIdNumber: "ID-0000000",
      occupants: 2,
      rentalFee: 250,
      deposit: 500,
      waterMeterStart: 120,
      electricityMeterStart: 845,
      startDate,
      endDate,
      notes: "Sample note: tenant keeps one small pet cat, agreed verbally with the landlord.",
    },
    room: { name: "Room 101", type: "1 Bedroom", size: 30, floor: "1" },
    apartment: { name: "Sample Apartment", address: "123 Example Street, Sample City" },
    workspaceName,
    facilityNames: ["Air Conditioner", "Wi-Fi", "Kitchen"],
    settings,
    preparedByName,
    generatedAt: new Date(),
    isPreview: true,
  };
}

/** Renders whatever's currently typed in the editor (not necessarily saved yet) against sample data. */
export async function previewContractTemplate(formData: FormData): Promise<{ pdfBase64: string } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const content = String(formData.get("content") ?? "");

  try {
    const settings = await getAppSettings(user.workspaceId);
    const data = buildSampleContractData(user.workspaceName ?? "RentalHRM", user.name ?? "Property Manager", settings);
    const pdfBytes = await generateContractAgreementPdf(data, content);
    return { pdfBase64: Buffer.from(pdfBytes).toString("base64") };
  } catch (error) {
    console.error("Failed to generate contract template preview:", error);
    return { error: "Couldn't generate the preview PDF. Please check the template and try again." };
  }
}
