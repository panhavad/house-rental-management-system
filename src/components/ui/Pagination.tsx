"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PAGE_SIZE_OPTIONS, PAGE_SIZE_COOKIE } from "@/lib/pagination";
import { useLanguage } from "@/components/LanguageProvider";

const PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function Pagination({
  page,
  pageSize,
  totalCount,
  searchParams,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  /** Current query params (excluding page/pageSize) so filters survive page changes. */
  searchParams: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [isNavigating, startTransition] = useTransition();
  /** Which control started the in-flight navigation, so only it shows a spinner. */
  const [pendingControl, setPendingControl] = useState<"prev" | "next" | "pageSize" | null>(null);

  function navigate(overrides: Record<string, string | number>, control: "prev" | "next" | "pageSize") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    for (const [key, value] of Object.entries(overrides)) {
      params.set(key, String(value));
    }
    setPendingControl(control);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handlePageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newSize = e.target.value;
    document.cookie = `${PAGE_SIZE_COOKIE}=${newSize}; path=/; max-age=${PAGE_SIZE_COOKIE_MAX_AGE}`;
    navigate({ pageSize: newSize, page: 1 }, "pageSize");
  }

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>{totalCount === 0 ? t("No results") : `${start}–${end} of ${totalCount}`}</span>
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          disabled={isNavigating}
          aria-label={t("Rows per page")}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}/page
            </option>
          ))}
        </select>
        {isNavigating && pendingControl === "pageSize" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={page <= 1 || isNavigating}
          onClick={() => navigate({ page: page - 1 }, "prev")}
          aria-label={t("Previous page")}
          className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isNavigating && pendingControl === "prev" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <span className="text-sm text-slate-600">
          {t("Page {current} of {total}", { current: page, total: totalPages })}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || isNavigating}
          onClick={() => navigate({ page: page + 1 }, "next")}
          aria-label={t("Next page")}
          className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isNavigating && pendingControl === "next" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
