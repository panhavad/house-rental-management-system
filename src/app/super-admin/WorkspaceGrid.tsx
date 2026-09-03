"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Users, CheckSquare, Square, X, Download, Copy, Trash2, Loader2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { CardLink } from "@/components/ui/StatusLink";
import { Badge } from "@/components/ui/Badge";
import { deleteWorkspacesAction, duplicateWorkspacesAction } from "@/app/super-admin/backup-actions";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isDemo: boolean;
  userCount: number;
  apartmentCount: number;
};

/**
 * Renders the workspace cards, plus a "Select" mode that turns each card into
 * a checkbox so several workspaces can be backed up, duplicated or removed at
 * once. Outside select mode, cards behave exactly as before (click to open).
 */
export function WorkspaceGrid({ workspaces }: { workspaces: WorkspaceSummary[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<"duplicate" | "delete" | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelected(new Set());
    setMessage(null);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBackupSelected() {
    if (selected.size === 0) return;
    window.open(`/api/backup/export?workspaceIds=${[...selected].join(",")}`, "_blank");
  }

  function handleDuplicateSelected() {
    if (selected.size === 0 || pending) return;
    const ids = [...selected];
    setActiveAction("duplicate");
    startTransition(async () => {
      const result = await duplicateWorkspacesAction(ids);
      setMessage({ text: result.message, error: result.error });
      setSelected(new Set());
      setActiveAction(null);
      router.refresh();
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0 || pending) return;
    const ids = [...selected];
    const names = workspaces.filter((w) => ids.includes(w.id)).map((w) => w.name);
    const confirmed = confirm(
      `Permanently delete ${ids.length} workspace(s) and everything in them (${names.join(", ")})? This cannot be undone.`
    );
    if (!confirmed) return;
    setActiveAction("delete");
    startTransition(async () => {
      const result = await deleteWorkspacesAction(ids);
      setMessage({ text: result.message, error: result.error });
      setSelected(new Set());
      setActiveAction(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleSelectMode}
          className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
            selectMode
              ? "bg-slate-900 text-white hover:bg-slate-700"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {selectMode ? (
            <X className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {selectMode ? "Cancel" : "Select"}
        </button>

        {selectMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{selected.size} selected</span>
            <button
              type="button"
              onClick={handleBackupSelected}
              disabled={selected.size === 0 || pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              Backup
            </button>
            <button
              type="button"
              onClick={handleDuplicateSelected}
              disabled={selected.size === 0 || pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === "duplicate" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              Duplicate
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selected.size === 0 || pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === "delete" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              Remove
            </button>
          </div>
        ) : null}
      </div>

      {message ? (
        <p
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            message.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {workspaces.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">No workspaces yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => {
            const isSelected = selected.has(workspace.id);
            const card = (
              <Card
                className={`h-full transition-shadow ${selectMode ? "" : "hover:shadow-md"} ${
                  isSelected ? "ring-2 ring-slate-900" : ""
                }`}
              >
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {selectMode ? (
                        isSelected ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-slate-900" aria-hidden="true" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                        )
                      ) : null}
                      <h3 className="font-semibold text-slate-900">{workspace.name}</h3>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {workspace.isDemo ? <Badge tone="blue">Demo</Badge> : null}
                      <Badge tone={workspace.isActive ? "green" : "slate"}>
                        {workspace.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">/{workspace.slug}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      {workspace.userCount}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      {workspace.apartmentCount}
                    </span>
                  </div>
                </CardBody>
              </Card>
            );

            return selectMode ? (
              <button
                key={workspace.id}
                type="button"
                onClick={() => toggle(workspace.id)}
                className="text-left"
                aria-pressed={isSelected}
              >
                {card}
              </button>
            ) : (
              <CardLink key={workspace.id} href={`/super-admin/workspaces/${workspace.id}`}>
                {card}
              </CardLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
