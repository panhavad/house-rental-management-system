-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantPhone" TEXT,
    "tenantEmail" TEXT,
    "tenantIdNumber" TEXT,
    "occupants" INTEGER NOT NULL DEFAULT 1,
    "rentalFee" REAL NOT NULL,
    "deposit" REAL NOT NULL DEFAULT 0,
    "waterMeterStart" REAL NOT NULL DEFAULT 0,
    "electricityMeterStart" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "terminatedAt" DATETIME,
    "terminationReason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Contract" ("createdAt", "deposit", "endDate", "id", "notes", "occupants", "rentalFee", "roomId", "startDate", "status", "tenantEmail", "tenantIdNumber", "tenantName", "tenantPhone", "terminatedAt", "terminationReason", "updatedAt") SELECT "createdAt", "deposit", "endDate", "id", "notes", "occupants", "rentalFee", "roomId", "startDate", "status", "tenantEmail", "tenantIdNumber", "tenantName", "tenantPhone", "terminatedAt", "terminationReason", "updatedAt" FROM "Contract";
DROP TABLE "Contract";
ALTER TABLE "new_Contract" RENAME TO "Contract";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
