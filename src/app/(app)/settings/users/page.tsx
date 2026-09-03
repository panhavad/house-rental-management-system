import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { ROLE_LABELS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SubmitStatusButton } from "@/components/ui/SubmitStatusButton";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { createUser, updateUserRole, toggleUserActive } from "@/app/(app)/settings/users/actions";
import { redirect } from "next/navigation";
import { UserPlus, Save, UserCheck, UserX, User, Mail, Lock, ShieldCheck } from "lucide-react";
import { resolvePage, resolvePageSize, paginationSkipTake, PAGE_SIZE_COOKIE } from "@/lib/pagination";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const user = await requireWorkspaceUser();
  if (user.role !== "ADMIN") redirect("/");

  const { page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const cookieStore = await cookies();
  const page = resolvePage(pageParam);
  const pageSize = resolvePageSize(pageSizeParam, cookieStore.get(PAGE_SIZE_COOKIE)?.value);

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      ...paginationSkipTake(page, pageSize),
    }),
    prisma.user.count({ where: { workspaceId: user.workspaceId } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts and roles (administrator only)"
        breadcrumbs={[{ label: "Users" }]}
      />

      <Card className="mb-6">
        <div className="p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Add user</h2>
          <form action={createUser} className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" icon={User} required>
              <Input id="name" name="name" required />
            </Field>
            <Field label="Email" htmlFor="email" icon={Mail} required>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field label="Password" htmlFor="password" icon={Lock} required>
              <Input id="password" name="password" type="password" minLength={8} required />
            </Field>
            <Field label="Role" htmlFor="role" icon={ShieldCheck} required>
              <Select id="role" name="role" required defaultValue="STAFF">
                <option value="ADMIN">Administrator</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
                <option value="VIEWER">Viewer</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" icon={UserPlus}>
                Add user
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3 text-slate-900">{u.name}</td>
                <td className="px-5 py-3 text-slate-600">{u.email}</td>
                <td className="px-5 py-3">
                  <form action={updateUserRole.bind(null, u.id)} className="flex items-center gap-2">
                    <Select name="role" defaultValue={u.role} className="w-36">
                      <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                      <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
                      <option value="STAFF">{ROLE_LABELS.STAFF}</option>
                      <option value="VIEWER">{ROLE_LABELS.VIEWER}</option>
                    </Select>
                    <SubmitStatusButton
                      type="submit"
                      icon={<Save className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Save
                    </SubmitStatusButton>
                  </form>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={u.isActive ? "green" : "slate"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-5 py-3">
                  {u.id === user.id ? (
                    <span className="text-xs text-slate-400">You</span>
                  ) : (
                    <form action={toggleUserActive.bind(null, u.id)}>
                      <SubmitStatusButton
                        type="submit"
                        icon={
                          u.isActive ? (
                            <UserX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )
                        }
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white ${
                          u.isActive ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
                        }`}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </SubmitStatusButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination page={page} pageSize={pageSize} totalCount={totalCount} searchParams={{}} />
      </Card>
    </div>
  );
}
