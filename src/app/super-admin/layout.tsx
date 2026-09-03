import { requireSuperAdmin } from "@/lib/auth-guard";
import { logoutAction } from "@/lib/actions/logout";
import { SubmitStatusButton } from "@/components/ui/SubmitStatusButton";
import { LogOut, ShieldAlert } from "lucide-react";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-900 px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2 font-semibold text-white">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          RentalHRM · Super Admin
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-300 md:block">{user.name}</span>
          <form action={logoutAction}>
            <SubmitStatusButton
              type="submit"
              icon={<LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              <span className="hidden sm:inline">Sign out</span>
            </SubmitStatusButton>
          </form>
        </div>
      </header>
      <main className="min-w-0 flex-1 bg-slate-50 p-4 sm:p-6">{children}</main>
    </div>
  );
}
