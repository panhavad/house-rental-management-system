import { requireWorkspaceUser } from "@/lib/auth-guard";
import { ROLE_LABELS } from "@/lib/rbac";
import { Sidebar } from "@/components/ui/Sidebar";
import { MobileIconNav } from "@/components/ui/MobileIconNav";
import { WorkspaceSwitcher } from "@/components/ui/WorkspaceSwitcher";
import { SubmitStatusButton } from "@/components/ui/SubmitStatusButton";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { logoutAction } from "@/lib/actions/logout";
import { exitImpersonationAction } from "@/lib/actions/impersonation";
import { LogOut, ShieldAlert, DoorOpen } from "lucide-react";
import { APP_VERSION, APP_RELEASE_DATE } from "@/lib/app-info";
import { getAttentionSummary } from "@/lib/attention";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireWorkspaceUser();
  const attention = await getAttentionSummary(user.workspaceId);

  return (
    <div className="flex min-h-screen flex-col">
      {user.impersonating ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950 sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Super Admin viewing &amp; managing <strong>{user.workspaceName}</strong> as its administrator
          </span>
          <form action={exitImpersonationAction}>
            <SubmitStatusButton
              type="submit"
              icon={<DoorOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              className="inline-flex items-center gap-1 rounded-md bg-amber-950/10 px-2.5 py-1 text-xs font-semibold hover:bg-amber-950/20"
            >
              Exit to Super Admin
            </SubmitStatusButton>
          </form>
        </div>
      ) : null}
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <span className="font-semibold text-slate-900">
          RentalHRM{user.workspaceName ? <span className="ml-2 font-normal text-slate-400">· {user.workspaceName}</span> : null}
        </span>
        <div className="flex items-center gap-3">
          {!user.impersonating ? (
            <WorkspaceSwitcher
              currentWorkspaceId={user.workspaceId}
              workspaces={user.availableWorkspaces.map((w) => ({
                workspaceId: w.workspaceId,
                workspaceName: w.workspaceName,
              }))}
            />
          ) : null}
          <NotificationBell attention={attention} />
          <div className="hidden text-sm md:block">
            <span className="font-medium text-slate-900">{user.name}</span>
            <span className="ml-2 text-slate-400">{ROLE_LABELS[user.role]}</span>
          </div>
          <form action={logoutAction}>
            <SubmitStatusButton
              type="submit"
              icon={<LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <span className="hidden sm:inline">Sign out</span>
            </SubmitStatusButton>
          </form>
        </div>
      </header>
      <Sidebar role={user.role} />
      <MobileIconNav role={user.role} />
      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      <div className="pointer-events-none fixed bottom-2 left-2 z-10 text-xs text-slate-400">
        <p>v{APP_VERSION}</p>
        <p>{APP_RELEASE_DATE}</p>
      </div>
    </div>
  );
}
