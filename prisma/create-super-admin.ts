// Creates (or updates the password of) the platform Super Admin account.
//
// Unlike `prisma/seed.ts` — which is demo/dev-only and creates a hardcoded, weak
// password plus unrelated sample workspace data — this script only touches the Super
// Admin user and always requires a real name/email/password supplied via environment
// variables. Safe to run against a production database.
//
// Usage:
//   SUPER_ADMIN_NAME="Jane Doe" SUPER_ADMIN_EMAIL="jane@example.com" SUPER_ADMIN_PASSWORD="..." \
//     npm run db:create-super-admin
//
// Re-running with the same email updates that Super Admin's name/password instead of
// creating a duplicate, so this also doubles as a password-reset tool.
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${name}. Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL ` +
        `and SUPER_ADMIN_PASSWORD before running this script.`
    );
  }
  return value.trim();
}

async function main() {
  const name = requireEnv("SUPER_ADMIN_NAME");
  const email = requireEnv("SUPER_ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("SUPER_ADMIN_PASSWORD");

  if (password.length < 8) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters long.");
  }

  const passwordHash = await hash(password, 10);

  // Super Admins belong to no workspace (workspaceId: null), so they're identified by
  // email alone among the workspace-less accounts.
  const existing = await prisma.user.findFirst({
    where: { email, workspaceId: null, role: "SUPER_ADMIN" },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash, isActive: true },
    });
    console.log(`Updated existing Super Admin "${email}".`);
  } else {
    await prisma.user.create({
      data: { name, email, passwordHash, role: "SUPER_ADMIN", workspaceId: null },
    });
    console.log(`Created new Super Admin "${email}".`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
