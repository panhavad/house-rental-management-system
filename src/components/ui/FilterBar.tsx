"use client";

import { ReactNode, createContext, useCallback, useContext, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { Loader2, X } from "lucide-react";
import { Input, Select } from "@/components/ui/Field";

type FilterValues = Record<string, string | undefined>;

/** Which control started the current navigation, so only it shows a spinner. */
type FilterSource = "field" | "clear";

type FilterContextValue = {
  values: FilterValues;
  apply: (updates: FilterValues, source?: FilterSource) => void;
  pending: boolean;
};

const FilterContext = createContext<FilterContextValue | null>(null);

function useFilterBar() {
  const context = useContext(FilterContext);
  if (!context) throw new Error("Filter fields must be rendered inside <FilterBar>");
  return context;
}

/**
 * Filters apply live: changing any field navigates immediately, so no submit
 * button is needed. `values` holds the params to carry over between changes
 * (current filters plus anything else worth keeping, e.g. `pageSize`).
 */
export function FilterBar({
  values,
  clearableKeys,
  className,
  children,
}: {
  values: FilterValues;
  /** Params cleared by "Clear filters". Defaults to every key in `values`. */
  clearableKeys?: string[];
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [pendingSource, setPendingSource] = useState<FilterSource>("field");

  function apply(updates: FilterValues, source: FilterSource = "field") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...values, ...updates })) {
      if (value) params.set(key, value);
    }
    // Any filter change invalidates the current page offset.
    params.delete("page");
    const query = params.toString();
    setPendingSource(source);
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  const clearable = clearableKeys ?? Object.keys(values);
  const hasActiveFilter = clearable.some((key) => values[key]);

  return (
    <FilterContext.Provider value={{ values, apply, pending }}>
      <div
        className={twMerge(
          "mb-4 flex flex-col gap-2 transition-opacity sm:flex-row sm:flex-wrap sm:items-end",
          pending ? "opacity-60" : "",
          className,
        )}
      >
        {children}
        {hasActiveFilter ? (
          <ClearFiltersButton
            loading={pending && pendingSource === "clear"}
            onClear={() => apply(Object.fromEntries(clearable.map((key) => [key, undefined])), "clear")}
          />
        ) : null}
      </div>
    </FilterContext.Provider>
  );
}

/**
 * Shows the spinner only when *this* button started the navigation — changing
 * a filter select also makes the bar pending, and that shouldn't look like the
 * clear button is working.
 */
function ClearFiltersButton({ loading, onClear }: { loading: boolean; onClear: () => void }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClear}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <X className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      Clear filters
    </button>
  );
}

/**
 * Keeps the field responsive while the navigation triggered by a change is in
 * flight: the draft shows the user's pick immediately and re-syncs whenever the
 * server-provided value changes (e.g. browser back/forward).
 */
function useLiveValue(value: string) {
  const [state, setState] = useState({ draft: value, syncedWith: value });
  if (state.syncedWith !== value) {
    setState({ draft: value, syncedWith: value });
  }
  const setDraft = useCallback((next: string) => setState((prev) => ({ ...prev, draft: next })), []);
  return [state.syncedWith === value ? state.draft : value, setDraft] as const;
}

export function FilterSelect({
  name,
  value,
  label,
  className,
  children,
}: {
  name: string;
  value: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { apply } = useFilterBar();
  const [draft, setDraft] = useLiveValue(value);

  return (
    <Select
      aria-label={label}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        apply({ [name]: event.target.value });
      }}
      className={className}
    >
      {children}
    </Select>
  );
}

export function FilterMonth({
  name,
  value,
  label,
  className,
}: {
  name: string;
  value: string;
  label: string;
  className?: string;
}) {
  const { apply } = useFilterBar();
  const [draft, setDraft] = useLiveValue(value);

  return (
    <Input
      type="month"
      aria-label={label}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        apply({ [name]: event.target.value });
      }}
      className={className}
    />
  );
}

export type ApartmentOption = {
  id: string;
  name: string;
  rooms: { id: string; name: string }[];
};

const APARTMENT_PREFIX = "apartment:";
const ROOM_PREFIX = "room:";

/**
 * One control covering both scopes: pick an entire apartment (every room in it)
 * or drill straight down to a single room, with rooms grouped under the
 * apartment they belong to. Selection still maps onto the `apartmentId` /
 * `roomId` query params so the server filtering stays unchanged.
 */
export function ApartmentRoomFilter({
  apartments,
  apartmentId,
  roomId,
  className,
}: {
  apartments: ApartmentOption[];
  apartmentId: string;
  roomId: string;
  className?: string;
}) {
  const { apply } = useFilterBar();
  const selected = roomId ? `${ROOM_PREFIX}${roomId}` : apartmentId ? `${APARTMENT_PREFIX}${apartmentId}` : "";
  const [draft, setDraft] = useLiveValue(selected);

  function handleChange(next: string) {
    setDraft(next);
    if (next.startsWith(ROOM_PREFIX)) {
      const nextRoomId = next.slice(ROOM_PREFIX.length);
      const owner = apartments.find((apartment) => apartment.rooms.some((room) => room.id === nextRoomId));
      apply({ roomId: nextRoomId, apartmentId: owner?.id });
      return;
    }
    if (next.startsWith(APARTMENT_PREFIX)) {
      apply({ apartmentId: next.slice(APARTMENT_PREFIX.length), roomId: undefined });
      return;
    }
    apply({ apartmentId: undefined, roomId: undefined });
  }

  return (
    <Select
      aria-label="Filter by apartment or room"
      value={draft}
      onChange={(event) => handleChange(event.target.value)}
      className={className}
    >
      <option value="">All apartments &amp; rooms</option>
      {apartments.map((apartment) => (
        <optgroup key={apartment.id} label={apartment.name}>
          <option value={`${APARTMENT_PREFIX}${apartment.id}`}>All of {apartment.name}</option>
          {apartment.rooms.map((room) => (
            <option key={room.id} value={`${ROOM_PREFIX}${room.id}`}>
              {apartment.name} · {room.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
