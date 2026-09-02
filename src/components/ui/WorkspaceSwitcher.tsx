"use client";

import { useRef } from "react";
import { Building2 } from "lucide-react";
import { switchWorkspaceAction } from "@/lib/actions/workspace-switch";

export type SwitchableWorkspace = { workspaceId: string; workspaceName: string };

/**
 * Compact "which workspace am I in?" dropdown shown in the app header whenever
 * the signed-in email has more than one workspace available. Picking a
 * different one calls `switchWorkspaceAction`, which re-uses the workspace
 * list already verified at login — no password needed again.
 */
export function WorkspaceSwitcher({
  currentWorkspaceId,
  workspaces,
}: {
  currentWorkspaceId: string;
  workspaces: SwitchableWorkspace[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (workspaces.length <= 1) return null;

  return (
    <form ref={formRef} action={switchWorkspaceAction} className="hidden items-center gap-1.5 sm:flex">
      <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <select
        name="workspaceId"
        defaultValue={currentWorkspaceId}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Switch workspace"
        className="rounded-md border border-slate-200 bg-white py-1 pl-2 pr-6 text-sm text-slate-700 hover:bg-slate-50 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        {workspaces.map((workspace) => (
          <option key={workspace.workspaceId} value={workspace.workspaceId}>
            {workspace.workspaceName}
          </option>
        ))}
      </select>
    </form>
  );
}
