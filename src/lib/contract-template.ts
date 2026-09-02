import { prisma } from "@/lib/prisma";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/contract-pdf";

/**
 * Returns a workspace's custom contract template content, or `null` if it
 * hasn't customized one (callers should fall back to `DEFAULT_CONTRACT_TEMPLATE`
 * — `generateContractAgreementPdf` already does this when passed `null`).
 */
export async function getWorkspaceContractTemplate(workspaceId: string): Promise<string | null> {
  const row = await prisma.contractTemplate.findUnique({ where: { workspaceId } });
  return row?.content ?? null;
}

/** Saves (or replaces) a workspace's custom contract template. */
export async function saveWorkspaceContractTemplate(workspaceId: string, content: string): Promise<void> {
  await prisma.contractTemplate.upsert({
    where: { workspaceId },
    update: { content },
    create: { workspaceId, content },
  });
}

/** Removes a workspace's customization, reverting it back to `DEFAULT_CONTRACT_TEMPLATE`. */
export async function resetWorkspaceContractTemplate(workspaceId: string): Promise<void> {
  await prisma.contractTemplate.deleteMany({ where: { workspaceId } });
}

export { DEFAULT_CONTRACT_TEMPLATE };
