/**
 * Flat monthly utility prices agreed in a contract. A `null` price means that
 * utility is *not* fixed and stays on dynamic/post-paid billing (usage read
 * from the meter × the workspace rate in effect for that month).
 *
 * Pure helpers only — no database access — so this can safely be imported from
 * anywhere, including the PDF/template layer.
 */
export type FixedUtilityFees = {
  water: number | null;
  electricity: number | null;
};

export type FixedUtilityContract = {
  fixedUtilityEnabled: boolean;
  fixedWaterFee: number | null;
  fixedElectricityFee: number | null;
};

/** Prisma `select` for the contract columns the helpers below need. */
export const FIXED_UTILITY_SELECT = {
  fixedUtilityEnabled: true,
  fixedWaterFee: true,
  fixedElectricityFee: true,
} as const;

export function contractFixedUtilityFees(contract: FixedUtilityContract | null | undefined): FixedUtilityFees {
  if (!contract || !contract.fixedUtilityEnabled) return { water: null, electricity: null };
  return { water: contract.fixedWaterFee, electricity: contract.fixedElectricityFee };
}

/**
 * What one utility costs for a month: the agreed flat fee when it's fixed (the
 * meter reading is still recorded, it just no longer drives the price), or
 * usage × the workspace rate otherwise.
 */
export function utilityCharge(
  usage: number,
  ratePerUnit: number,
  fixedFee: number | null
): { rate: number; cost: number } {
  if (fixedFee !== null) return { rate: 0, cost: fixedFee };
  return { rate: ratePerUnit, cost: usage * ratePerUnit };
}

export function hasFixedUtilityFee(fees: FixedUtilityFees): boolean {
  return fees.water !== null || fees.electricity !== null;
}

/** Total of the fixed fees only — the part that can be invoiced without any meter reading. */
export function fixedUtilityTotal(fees: FixedUtilityFees): number {
  return (fees.water ?? 0) + (fees.electricity ?? 0);
}
