-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "maintenanceStartedAt" DATETIME,
    "maintenanceById" TEXT,
    "updatedAt" DATETIME NOT NULL
);
