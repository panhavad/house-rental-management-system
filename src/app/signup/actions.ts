"use server";

import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { signIn } from "@/auth";
import { createWorkspaceWithAdmin } from "@/lib/workspace";

export type SignupState = { error?: string };

export async function signupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!workspaceName || !adminName || !adminEmail || password.length < 8) {
    return { error: "Workspace name, your name, email and an 8+ character password are required." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const adminPasswordHash = await hash(password, 10);
  const { workspace } = await createWorkspaceWithAdmin({
    workspaceName,
    adminName,
    adminEmail,
    adminPasswordHash,
  });

  try {
    await signIn("credentials", {
      workspace: workspace.slug,
      email: adminEmail,
      password,
      redirectTo: "/setup",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // Workspace + user were created successfully; only the auto sign-in failed —
      // send them to log in manually instead of losing the new workspace.
      return { error: "Workspace created! Please sign in with your new workspace name, email and password." };
    }
    // NextAuth throws a redirect internally on success; let it propagate.
    throw error;
  }
}
