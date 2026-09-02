-- CreateTable
CREATE TABLE "LoginPreference" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "defaultWorkspaceId" TEXT,
    "updatedAt" DATETIME NOT NULL
);
