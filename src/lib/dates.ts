/** Returns the current month as "YYYY-MM", matching the format used across the app. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Returns the last calendar day of the given "YYYY-MM" month as a Date. */
export function lastDayOfMonth(month: string): Date {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0);
}
