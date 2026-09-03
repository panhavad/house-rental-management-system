CREATE TABLE "LanguagePack" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "translations" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);
