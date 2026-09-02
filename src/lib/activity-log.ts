import { prisma } from "@/lib/prisma";

export async function logActivity(params: {
  workspaceId: string;
  entityType: string;
  entityId: string;
  roomId?: string | null;
  action: string;
  description: string;
  performedById?: string | null;
  metadata?: Record<string, unknown>;
  /** Backdates the log entry (used by demo-data seeding to build a realistic history). Defaults to now. */
  createdAt?: Date;
}) {
  await prisma.activityLog.create({
    data: {
      workspaceId: params.workspaceId,
      entityType: params.entityType,
      entityId: params.entityId,
      roomId: params.roomId ?? null,
      action: params.action,
      description: params.description,
      performedById: params.performedById ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      createdAt: params.createdAt ?? undefined,
    },
  });
}
