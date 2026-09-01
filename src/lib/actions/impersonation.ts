"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, IMPERSONATE_COOKIE } from "@/lib/auth-guard";

/** Leaves the currently "entered" workspace and returns the super admin to /super-admin. */
export async function exitImpersonationAction() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
  redirect("/super-admin");
}
