import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_WORKSPACE = { id: "workspace-default", name: "Default Workspace", slug: "default" };

const SUPER_ADMIN = { name: "Super Admin", email: "superadmin@hrm.local", password: "SuperAdmin123!" };

const DEMO_USERS = [
  { name: "Admin User", email: "admin@hrm.local", password: "Admin123!", role: "ADMIN" as const },
  { name: "Property Manager", email: "manager@hrm.local", password: "Manager123!", role: "MANAGER" as const },
  { name: "Staff Member", email: "staff@hrm.local", password: "Staff123!", role: "STAFF" as const },
  { name: "Viewer", email: "viewer@hrm.local", password: "Viewer123!", role: "VIEWER" as const },
];

const DEMO_FACILITIES = [
  "Air Conditioner",
  "Light",
  "Kitchen",
  "Wi-Fi",
  "Water Heater",
  "Refrigerator",
  "Wardrobe",
  "Balcony",
  "Parking",
  "Washing Machine",
];

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: DEFAULT_WORKSPACE.id },
    update: {},
    create: DEFAULT_WORKSPACE,
  });

  // The one true super admin — belongs to no workspace, can see/manage everything.
  const superAdminPasswordHash = await hash(SUPER_ADMIN.password, 10);
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { email: SUPER_ADMIN.email, workspaceId: null },
  });
  if (!existingSuperAdmin) {
    await prisma.user.create({
      data: {
        name: SUPER_ADMIN.name,
        email: SUPER_ADMIN.email,
        passwordHash: superAdminPasswordHash,
        role: "SUPER_ADMIN",
        workspaceId: null,
      },
    });
  }

  for (const demoUser of DEMO_USERS) {
    const passwordHash = await hash(demoUser.password, 10);
    await prisma.user.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email: demoUser.email } },
      update: {},
      create: {
        name: demoUser.name,
        email: demoUser.email,
        passwordHash,
        role: demoUser.role,
        workspaceId: workspace.id,
      },
    });
  }

  for (const name of DEMO_FACILITIES) {
    await prisma.facility.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
      update: {},
      create: { name, workspaceId: workspace.id },
    });
  }

  await prisma.utilityRate.upsert({
    where: { id: "seed-rate-water" },
    update: {},
    create: { id: "seed-rate-water", type: "WATER", pricePerUnit: 0.8, workspaceId: workspace.id },
  });
  await prisma.utilityRate.upsert({
    where: { id: "seed-rate-electricity" },
    update: {},
    create: { id: "seed-rate-electricity", type: "ELECTRICITY", pricePerUnit: 0.25, workspaceId: workspace.id },
  });

  const apartment = await prisma.apartment.upsert({
    where: { id: "seed-apartment-1" },
    update: {},
    create: {
      id: "seed-apartment-1",
      workspaceId: workspace.id,
      name: "Sunrise Residence",
      address: "123 Main Street, Phnom Penh",
      description: "A demo apartment building with 3 sample rooms.",
    },
  });

  await prisma.room.upsert({
    where: { id: "seed-room-1" },
    update: {},
    create: {
      id: "seed-room-1",
      apartmentId: apartment.id,
      name: "Room 101",
      type: "Studio",
      size: 20,
      floor: "1",
      rentalFee: 250,
      status: "VACANT",
    },
  });
  await prisma.room.upsert({
    where: { id: "seed-room-2" },
    update: {},
    create: {
      id: "seed-room-2",
      apartmentId: apartment.id,
      name: "Room 102",
      type: "1 Bedroom",
      size: 30,
      floor: "1",
      rentalFee: 300,
      status: "VACANT",
    },
  });
  await prisma.room.upsert({
    where: { id: "seed-room-3" },
    update: {},
    create: {
      id: "seed-room-3",
      apartmentId: apartment.id,
      name: "Room 201",
      type: "1 Bedroom",
      size: 32,
      floor: "2",
      rentalFee: 350,
      status: "VACANT",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
