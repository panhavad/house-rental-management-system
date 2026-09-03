-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "fixedUtilityEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contract" ADD COLUMN "fixedWaterFee" REAL;
ALTER TABLE "Contract" ADD COLUMN "fixedElectricityFee" REAL;
