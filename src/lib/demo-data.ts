import { hash } from "bcryptjs";
import { addDays, addMonths, subDays, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLE_PERMISSIONS_SEED } from "@/lib/rbac";
import { uniqueSlug } from "@/lib/workspace";
import { logActivity } from "@/lib/activity-log";
import { lastDayOfMonth, monthKeyFor } from "@/lib/dates";

/**
 * Demo data seeding/teardown for the super admin's "Load demo data" / "Unload demo
 * data" toggle. Everything lives inside a single, clearly-marked workspace
 * (`Workspace.isDemo = true`) so it can be dropped in one shot — via cascading
 * foreign keys — without ever touching a real workspace, user, or their data.
 */

export const DEMO_ADMIN_EMAIL = "demo@hrm.v4d.ovh";
export const DEMO_ADMIN_PASSWORD = "demo123321";

/** All the demo login accounts, one per role, so the demo can showcase RBAC too. */
export const DEMO_ACCOUNTS = [
  { roleLabel: "Administrator", role: "ADMIN" as const, name: "Demo Admin", email: DEMO_ADMIN_EMAIL },
  { roleLabel: "Manager", role: "MANAGER" as const, name: "Demo Manager", email: "demo.manager@hrm.v4d.ovh" },
  { roleLabel: "Staff", role: "STAFF" as const, name: "Demo Staff", email: "demo.staff@hrm.v4d.ovh" },
  { roleLabel: "Viewer", role: "VIEWER" as const, name: "Demo Viewer", email: "demo.viewer@hrm.v4d.ovh" },
] satisfies { roleLabel: string; role: "ADMIN" | "MANAGER" | "STAFF" | "VIEWER"; name: string; email: string }[];

const DEMO_FACILITY_NAMES = [
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

const WATER_RATE = 0.8;
const ELECTRICITY_RATE = 0.25;
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "ABA Pay"];

type PaymentSpec = {
  monthsAgo: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  withReading: boolean;
};

type ContractSpec = {
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  tenantIdNumber: string;
  occupants: number;
  rentalFee: number;
  deposit: number;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "ENDED" | "TERMINATED";
  terminatedAt?: Date;
  terminationReason?: string;
  notes?: string;
  payments: PaymentSpec[];
};

type RoomSpec = {
  name: string;
  type: string;
  size: number;
  floor: string;
  rentalFee: number;
  status: "VACANT" | "OCCUPIED" | "MAINTENANCE";
  notes?: string;
  facilityNames: string[];
  /** Chronological order, oldest first. Only the last one may still be ACTIVE. */
  contracts: ContractSpec[];
  waterMeterStart: number;
  electricityMeterStart: number;
};

type ApartmentSpec = {
  name: string;
  address: string;
  description: string;
  createdAt: Date;
  rooms: RoomSpec[];
};

/** Builds the full 2-apartment demo dataset, with every date computed relative to `now`. */
function buildDemoApartments(now: Date): ApartmentSpec[] {
  return [
    {
      name: "Sunrise Residence",
      address: "123 Monivong Blvd, Phnom Penh",
      description: "Modern studio & 1-bedroom apartments near the riverside.",
      createdAt: subMonths(now, 9),
      rooms: [
        {
          name: "101",
          type: "Studio",
          size: 22,
          floor: "1",
          rentalFee: 250,
          status: "OCCUPIED",
          facilityNames: ["Air Conditioner", "Light", "Wi-Fi", "Kitchen"],
          waterMeterStart: 80,
          electricityMeterStart: 400,
          contracts: [
            {
              tenantName: "Sok Dara",
              tenantPhone: "012 345 678",
              tenantEmail: "sokdara@example.com",
              tenantIdNumber: "NID-001234",
              occupants: 1,
              rentalFee: 250,
              deposit: 250,
              startDate: subMonths(now, 6),
              endDate: addMonths(now, 6),
              status: "ACTIVE",
              notes: "Renewed for another 12 months.",
              payments: [
                { monthsAgo: 2, status: "PAID", withReading: true },
                { monthsAgo: 1, status: "PAID", withReading: true },
                { monthsAgo: 0, status: "PENDING", withReading: true },
              ],
            },
          ],
        },
        {
          name: "102",
          type: "1 Bedroom",
          size: 32,
          floor: "1",
          rentalFee: 300,
          status: "OCCUPIED",
          facilityNames: ["Air Conditioner", "Light", "Wi-Fi", "Kitchen", "Water Heater", "Wardrobe"],
          waterMeterStart: 95,
          electricityMeterStart: 520,
          contracts: [
            {
              tenantName: "Chan Sophea",
              tenantPhone: "012 555 111",
              tenantEmail: "chansophea@example.com",
              tenantIdNumber: "NID-002211",
              occupants: 2,
              rentalFee: 300,
              deposit: 300,
              startDate: subMonths(now, 3),
              endDate: addMonths(now, 9),
              status: "ACTIVE",
              payments: [
                { monthsAgo: 2, status: "PAID", withReading: true },
                { monthsAgo: 1, status: "OVERDUE", withReading: true },
                { monthsAgo: 0, status: "PENDING", withReading: true },
              ],
            },
          ],
        },
        {
          name: "103",
          type: "1 Bedroom",
          size: 30,
          floor: "1",
          rentalFee: 280,
          status: "VACANT",
          facilityNames: ["Light", "Kitchen", "Wi-Fi"],
          waterMeterStart: 60,
          electricityMeterStart: 300,
          contracts: [
            {
              tenantName: "Lim Vichet",
              tenantPhone: "012 777 222",
              tenantEmail: "limvichet@example.com",
              tenantIdNumber: "NID-003344",
              occupants: 1,
              rentalFee: 270,
              deposit: 270,
              startDate: subMonths(now, 8),
              endDate: subMonths(now, 1),
              status: "ENDED",
              notes: "Tenant moved out at the end of the lease; did not renew.",
              payments: [
                { monthsAgo: 2, status: "PAID", withReading: true },
                { monthsAgo: 1, status: "PAID", withReading: true },
              ],
            },
          ],
        },
        {
          name: "104",
          type: "2 Bedroom",
          size: 45,
          floor: "2",
          rentalFee: 380,
          status: "MAINTENANCE",
          notes: "Bathroom renovation in progress, expected done end of month.",
          facilityNames: ["Air Conditioner", "Light", "Kitchen", "Balcony", "Parking"],
          waterMeterStart: 40,
          electricityMeterStart: 200,
          contracts: [],
        },
      ],
    },
    {
      name: "Riverside Villas",
      address: "45 Riverside Road, Siem Reap",
      description: "Spacious rooms with balconies, walking distance to the river.",
      createdAt: subMonths(now, 15),
      rooms: [
        {
          name: "201",
          type: "Studio",
          size: 24,
          floor: "2",
          rentalFee: 260,
          status: "OCCUPIED",
          facilityNames: ["Air Conditioner", "Light", "Wi-Fi", "Refrigerator"],
          waterMeterStart: 70,
          electricityMeterStart: 350,
          contracts: [
            {
              tenantName: "Ratha Pich",
              tenantPhone: "016 888 999",
              tenantEmail: "rathapich@example.com",
              tenantIdNumber: "NID-004455",
              occupants: 1,
              rentalFee: 260,
              deposit: 260,
              startDate: subMonths(now, 10),
              endDate: addDays(now, 20),
              status: "ACTIVE",
              notes: "Lease ending soon — pending renewal decision.",
              payments: [
                { monthsAgo: 2, status: "PAID", withReading: true },
                { monthsAgo: 1, status: "PAID", withReading: true },
                // This month's reading hasn't been taken yet — shows up under
                // the dashboard's "Missing this month's reading" attention item.
                { monthsAgo: 0, status: "PENDING", withReading: false },
              ],
            },
          ],
        },
        {
          name: "202",
          type: "1 Bedroom",
          size: 34,
          floor: "2",
          rentalFee: 320,
          status: "OCCUPIED",
          facilityNames: ["Air Conditioner", "Light", "Wi-Fi", "Kitchen", "Washing Machine"],
          waterMeterStart: 110,
          electricityMeterStart: 600,
          contracts: [
            {
              tenantName: "Bunthoeun Heng",
              tenantPhone: "017 222 333",
              tenantEmail: "bunthoeunheng@example.com",
              tenantIdNumber: "NID-005566",
              occupants: 1,
              rentalFee: 300,
              deposit: 300,
              startDate: subMonths(now, 14),
              endDate: subMonths(now, 2),
              status: "TERMINATED",
              terminatedAt: subMonths(now, 9),
              terminationReason: "Repeated late rent payments and lease violations.",
              payments: [],
            },
            {
              tenantName: "Sreymom Kea",
              tenantPhone: "017 444 555",
              tenantEmail: "sreymomkea@example.com",
              tenantIdNumber: "NID-006677",
              occupants: 2,
              rentalFee: 320,
              deposit: 320,
              startDate: subMonths(now, 8),
              endDate: addMonths(now, 4),
              status: "ACTIVE",
              notes: "Long-term tenant, renewed once already.",
              payments: [
                { monthsAgo: 2, status: "PAID", withReading: true },
                { monthsAgo: 1, status: "PAID", withReading: true },
                { monthsAgo: 0, status: "PENDING", withReading: true },
              ],
            },
          ],
        },
        {
          name: "203",
          type: "2 Bedroom",
          size: 42,
          floor: "3",
          rentalFee: 400,
          status: "VACANT",
          facilityNames: ["Light", "Kitchen", "Balcony"],
          waterMeterStart: 0,
          electricityMeterStart: 0,
          contracts: [],
        },
        {
          name: "204",
          type: "Studio",
          size: 20,
          floor: "1",
          rentalFee: 240,
          status: "OCCUPIED",
          facilityNames: ["Air Conditioner", "Light", "Wi-Fi"],
          waterMeterStart: 20,
          electricityMeterStart: 100,
          contracts: [
            {
              tenantName: "Vanna Chan",
              tenantPhone: "011 999 000",
              tenantEmail: "vannachan@example.com",
              tenantIdNumber: "NID-007788",
              occupants: 1,
              rentalFee: 240,
              deposit: 240,
              startDate: subDays(now, 20),
              endDate: addMonths(now, 11),
              status: "ACTIVE",
              notes: "New move-in.",
              // Brand new tenant — first reading isn't due yet, just the rent invoice.
              payments: [{ monthsAgo: 0, status: "PENDING", withReading: false }],
            },
          ],
        },
      ],
    },
  ];
}

/** Finds the current demo workspace, if one is loaded. */
export async function findDemoWorkspace() {
  return prisma.workspace.findFirst({ where: { isDemo: true } });
}

/**
 * Deletes the demo workspace and everything in it (users, apartments, rooms,
 * contracts, payments, utility readings, facilities, rates, role permissions,
 * activity log) via the existing cascading foreign keys. A no-op if no demo
 * workspace is currently loaded. Never touches any other workspace or user.
 */
export async function unloadDemoData(): Promise<boolean> {
  const workspace = await findDemoWorkspace();
  if (!workspace) return false;
  await prisma.workspace.delete({ where: { id: workspace.id } });
  return true;
}

/**
 * Creates a brand-new, fully isolated "Demo Workspace" with two furnished
 * apartments covering every room/contract/payment status, utility readings,
 * rate history, and a full set of demo login accounts (one per role) — so a
 * prospective user can explore every feature immediately. Always starts from a
 * clean slate: if demo data is already loaded, it's torn down and rebuilt with
 * fresh, "today"-relative dates. Never affects any real workspace or user.
 */
export async function loadDemoData() {
  await unloadDemoData();

  const now = new Date();
  const slug = await uniqueSlug("demo");

  const workspace = await prisma.workspace.create({
    data: { name: "Demo Workspace", slug, isDemo: true, onboardingCompletedAt: now },
  });

  await prisma.appSetting.create({ data: { workspaceId: workspace.id } });
  await prisma.rolePermission.createMany({
    data: DEFAULT_ROLE_PERMISSIONS_SEED.map((row) => ({ ...row, workspaceId: workspace.id })),
  });

  let adminUserId = "";
  for (const account of DEMO_ACCOUNTS) {
    const passwordHash = await hash(DEMO_ADMIN_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
      },
    });
    if (account.role === "ADMIN") adminUserId = user.id;
  }

  const facilitiesByName = new Map<string, string>();
  for (const name of DEMO_FACILITY_NAMES) {
    const facility = await prisma.facility.create({ data: { workspaceId: workspace.id, name } });
    facilitiesByName.set(name, facility.id);
  }

  // Rate history: an older rate plus the current one, so "Utility rates" shows a
  // real history instead of a single row.
  await prisma.utilityRate.create({
    data: { workspaceId: workspace.id, type: "WATER", pricePerUnit: 0.6, effectiveFrom: subMonths(now, 6) },
  });
  await prisma.utilityRate.create({
    data: { workspaceId: workspace.id, type: "ELECTRICITY", pricePerUnit: 0.18, effectiveFrom: subMonths(now, 6) },
  });
  await prisma.utilityRate.create({
    data: { workspaceId: workspace.id, type: "WATER", pricePerUnit: WATER_RATE, effectiveFrom: subMonths(now, 1) },
  });
  await prisma.utilityRate.create({
    data: {
      workspaceId: workspace.id,
      type: "ELECTRICITY",
      pricePerUnit: ELECTRICITY_RATE,
      effectiveFrom: subMonths(now, 1),
    },
  });

  const apartments = buildDemoApartments(now);

  for (const apartmentSpec of apartments) {
    const apartment = await prisma.apartment.create({
      data: {
        workspaceId: workspace.id,
        name: apartmentSpec.name,
        address: apartmentSpec.address,
        description: apartmentSpec.description,
        createdAt: apartmentSpec.createdAt,
      },
    });
    await logActivity({
      workspaceId: workspace.id,
      entityType: "APARTMENT",
      entityId: apartment.id,
      action: "APARTMENT_CREATED",
      description: `Apartment "${apartment.name}" was created.`,
      performedById: adminUserId,
      createdAt: apartmentSpec.createdAt,
    });

    for (const [roomIndex, roomSpec] of apartmentSpec.rooms.entries()) {
      const roomCreatedAt = addDays(apartmentSpec.createdAt, roomIndex);
      const room = await prisma.room.create({
        data: {
          apartmentId: apartment.id,
          name: roomSpec.name,
          type: roomSpec.type,
          size: roomSpec.size,
          floor: roomSpec.floor,
          rentalFee: roomSpec.rentalFee,
          status: roomSpec.status,
          notes: roomSpec.notes,
          createdAt: roomCreatedAt,
          facilities: {
            create: roomSpec.facilityNames
              .map((name) => facilitiesByName.get(name))
              .filter((facilityId): facilityId is string => Boolean(facilityId))
              .map((facilityId) => ({ facilityId })),
          },
        },
      });
      await logActivity({
        workspaceId: workspace.id,
        entityType: "ROOM",
        entityId: room.id,
        roomId: room.id,
        action: "ROOM_CREATED",
        description: `Room "${room.name}" was created.`,
        performedById: adminUserId,
        createdAt: roomCreatedAt,
      });

      let waterPrevious = roomSpec.waterMeterStart;
      let electricityPrevious = roomSpec.electricityMeterStart;

      for (const contractSpec of roomSpec.contracts) {
        // Each contract's move-in meter values pick up wherever the previous
        // tenancy's readings left off (or the room's original install values,
        // for the very first contract) — the same continuity real readings get.
        const contractWaterMeterStart = waterPrevious;
        const contractElectricityMeterStart = electricityPrevious;

        const contract = await prisma.contract.create({
          data: {
            roomId: room.id,
            tenantName: contractSpec.tenantName,
            tenantPhone: contractSpec.tenantPhone,
            tenantEmail: contractSpec.tenantEmail,
            tenantIdNumber: contractSpec.tenantIdNumber,
            occupants: contractSpec.occupants,
            rentalFee: contractSpec.rentalFee,
            deposit: contractSpec.deposit,
            waterMeterStart: contractWaterMeterStart,
            electricityMeterStart: contractElectricityMeterStart,
            startDate: contractSpec.startDate,
            endDate: contractSpec.endDate,
            status: contractSpec.status,
            terminatedAt: contractSpec.terminatedAt,
            terminationReason: contractSpec.terminationReason,
            notes: contractSpec.notes,
            createdAt: contractSpec.startDate,
          },
        });
        await logActivity({
          workspaceId: workspace.id,
          entityType: "CONTRACT",
          entityId: contract.id,
          roomId: room.id,
          action: "CONTRACT_STARTED",
          description: `New contract started with tenant "${contract.tenantName}" (${contract.occupants} occupant${contract.occupants === 1 ? "" : "s"}).`,
          performedById: adminUserId,
          createdAt: contractSpec.startDate,
        });
        if (contractSpec.status === "ENDED") {
          await logActivity({
            workspaceId: workspace.id,
            entityType: "CONTRACT",
            entityId: contract.id,
            roomId: room.id,
            action: "CONTRACT_ENDED",
            description: `Contract with tenant "${contract.tenantName}" ended.`,
            performedById: adminUserId,
            createdAt: contractSpec.endDate,
          });
        }
        if (contractSpec.status === "TERMINATED") {
          await logActivity({
            workspaceId: workspace.id,
            entityType: "CONTRACT",
            entityId: contract.id,
            roomId: room.id,
            action: "CONTRACT_TERMINATED",
            description: `Contract with tenant "${contract.tenantName}" was terminated early: ${contractSpec.terminationReason ?? ""}`,
            performedById: adminUserId,
            createdAt: contractSpec.terminatedAt ?? contractSpec.endDate,
          });
        }

        // Oldest month first, so the room's water/electricity meters climb realistically.
        const orderedPayments = [...contractSpec.payments].sort((a, b) => b.monthsAgo - a.monthsAgo);
        for (const [paymentIndex, paymentSpec] of orderedPayments.entries()) {
          const monthDate = subMonths(now, paymentSpec.monthsAgo);
          const month = monthKeyFor(monthDate);
          const dueDate = lastDayOfMonth(month);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const generatedAt = addDays(monthStart, 1);
          const method = PAYMENT_METHODS[paymentIndex % PAYMENT_METHODS.length];

          let utilityReadingId: string | null = null;
          let utilityAmount = 0;
          let readingCreatedAt = generatedAt;

          if (paymentSpec.withReading) {
            const waterUsage = 6 + roomIndex * 2;
            const electricityUsage = 100 + roomIndex * 15;
            const waterCurrent = waterPrevious + waterUsage;
            const electricityCurrent = electricityPrevious + electricityUsage;
            const waterCost = waterUsage * WATER_RATE;
            const electricityCost = electricityUsage * ELECTRICITY_RATE;
            utilityAmount = waterCost + electricityCost;
            readingCreatedAt = addDays(monthStart, 3);

            const reading = await prisma.utilityReading.create({
              data: {
                roomId: room.id,
                month,
                waterPrevious,
                waterCurrent,
                waterUsage,
                waterRate: WATER_RATE,
                waterCost,
                electricityPrevious,
                electricityCurrent,
                electricityUsage,
                electricityRate: ELECTRICITY_RATE,
                electricityCost,
                totalCost: utilityAmount,
                createdAt: readingCreatedAt,
              },
            });
            utilityReadingId = reading.id;
            waterPrevious = waterCurrent;
            electricityPrevious = electricityCurrent;

            await logActivity({
              workspaceId: workspace.id,
              entityType: "UTILITY",
              entityId: reading.id,
              roomId: room.id,
              action: "UTILITY_RECORDED",
              description: `Utility reading for ${month} recorded (water: ${waterUsage} units, electricity: ${electricityUsage} units, total: ${utilityAmount.toFixed(2)} USD).`,
              performedById: adminUserId,
              createdAt: readingCreatedAt,
            });
          }

          const totalAmount = contractSpec.rentalFee + utilityAmount;
          const paidAt = paymentSpec.status === "PAID" ? subDays(dueDate, 4) : null;

          const payment = await prisma.payment.create({
            data: {
              roomId: room.id,
              contractId: contract.id,
              utilityReadingId,
              month,
              rentalFee: contractSpec.rentalFee,
              utilityAmount,
              totalAmount,
              status: paymentSpec.status,
              dueDate,
              paidAt,
              paidAmount: paymentSpec.status === "PAID" ? totalAmount : null,
              method: paymentSpec.status === "PAID" ? method : null,
              createdAt: generatedAt,
            },
          });
          await logActivity({
            workspaceId: workspace.id,
            entityType: "PAYMENT",
            entityId: payment.id,
            roomId: room.id,
            action: "PAYMENT_GENERATED",
            description: `Payment of ${totalAmount.toFixed(2)} USD generated for ${month}.`,
            performedById: adminUserId,
            createdAt: generatedAt,
          });
          if (paymentSpec.status === "PAID" && paidAt) {
            await logActivity({
              workspaceId: workspace.id,
              entityType: "PAYMENT",
              entityId: payment.id,
              roomId: room.id,
              action: "PAYMENT_PAID",
              description: `Payment for ${month} marked as PAID.`,
              performedById: adminUserId,
              createdAt: paidAt,
            });
          } else if (paymentSpec.status === "OVERDUE") {
            await logActivity({
              workspaceId: workspace.id,
              entityType: "PAYMENT",
              entityId: payment.id,
              roomId: room.id,
              action: "PAYMENT_OVERDUE",
              description: `Payment for ${month} marked as OVERDUE.`,
              performedById: adminUserId,
              createdAt: addDays(dueDate, 5),
            });
          }
        }
      }
    }
  }

  return { workspace };
}
