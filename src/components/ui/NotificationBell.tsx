"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Droplets, FileClock, X } from "lucide-react";
import type { AttentionItem, AttentionSummary } from "@/lib/attention";

type NotificationGroupProps = {
  title: string;
  count: number;
  items: AttentionItem[];
  icon: typeof AlertTriangle;
  tone: "red" | "sky" | "amber";
  onNavigate: () => void;
};

function NotificationGroup({
  title,
  count,
  items,
  icon: Icon,
  tone,
  onNavigate,
}: NotificationGroupProps) {
  if (count === 0) return null;

  const toneClasses = {
    red: "bg-red-50 text-red-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <section aria-labelledby={`notification-group-${tone}`}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 id={`notification-group-${tone}`} className="text-sm font-semibold text-slate-900">
          {title}
        </h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {count}
        </span>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className="block px-4 py-3 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NotificationBell({ attention }: { attention: AttentionSummary }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const title =
    attention.totalCount > 0
      ? `${attention.totalCount} item${attention.totalCount === 1 ? "" : "s"} need attention`
      : "No pending reminders";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title={title}
        aria-label={`${title}. ${open ? "Close" : "Open"} notifications`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <Bell className="h-5 w-5 shrink-0" aria-hidden="true" />
        {attention.totalCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {attention.totalCount > 9 ? "9+" : attention.totalCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="font-semibold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">{title}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {attention.totalCount === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-800">All caught up</p>
              <p className="mt-1 text-xs text-slate-500">Nothing needs action right now.</p>
            </div>
          ) : (
            <div className="max-h-[70vh] divide-y divide-slate-200 overflow-y-auto overscroll-contain">
              <NotificationGroup
                title="Overdue payments"
                count={attention.overdueCount}
                items={attention.overduePayments}
                icon={AlertTriangle}
                tone="red"
                onNavigate={() => setOpen(false)}
              />
              <NotificationGroup
                title="Missing this month's readings"
                count={attention.missingReadingsCount}
                items={attention.missingReadings}
                icon={Droplets}
                tone="sky"
                onNavigate={() => setOpen(false)}
              />
              <NotificationGroup
                title="Contracts expiring soon"
                count={attention.expiringContractsCount}
                items={attention.expiringContracts}
                icon={FileClock}
                tone="amber"
                onNavigate={() => setOpen(false)}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
