export const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 30;
export const PAGE_SIZE_COOKIE = "pageSize";

/** Resolves the page size: explicit URL param wins, then the remembered cookie, then the default. */
export function resolvePageSize(searchParamValue?: string, cookieValue?: string): PageSize {
  const candidate = Number(searchParamValue ?? cookieValue);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(candidate)
    ? (candidate as PageSize)
    : DEFAULT_PAGE_SIZE;
}

/** Resolves the current 1-based page number from a URL param, defaulting to 1. */
export function resolvePage(searchParamValue?: string): number {
  const parsed = Number(searchParamValue);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export function paginationSkipTake(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
