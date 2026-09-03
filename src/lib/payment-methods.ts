import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * A workspace's configured ways to receive payment (bank transfer, e-wallet QR,
 * ...), in creation order. Printed on generated invoices so tenants know how to
 * pay. Cached per request since both the settings page and invoice generation
 * may read this within the same request.
 */
export const getWorkspacePaymentMethods = cache(async (workspaceId: string) => {
  return prisma.paymentMethod.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
});
