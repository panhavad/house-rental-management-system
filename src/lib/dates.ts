/** Formats any date as "YYYY-MM", matching the month key format used across the app. */
export function monthKeyFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Returns the current month as "YYYY-MM", matching the format used across the app. */
export function currentMonth(): string {
  return monthKeyFor(new Date());
}

/** Returns the last calendar day of the given "YYYY-MM" month as a Date. */
export function lastDayOfMonth(month: string): Date {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0);
}

/** Returns the first calendar day of the given "YYYY-MM" month as a Date. */
export function firstDayOfMonth(month: string): Date {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon - 1, 1);
}
