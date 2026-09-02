"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findLoginCandidates, LoginCandidate } from "@/lib/login-candidates";
import { SUPER_ADMIN_SELECTION, LoginCandidateOption, LoginState } from "@/app/login/login-types";

function toOption(candidate: LoginCandidate): LoginCandidateOption {
  return candidate.kind === "super-admin"
    ? { kind: "super-admin", label: candidate.name }
    : {
        kind: "workspace",
        label: candidate.workspaceName,
        role: candidate.role,
        workspaceSlug: candidate.workspaceSlug,
        workspaceId: candidate.workspaceId,
      };
}

async function trySignIn(selection: string, email: string, password: string, callbackUrl: string): Promise<LoginState> {
  try {
    await signIn("credentials", {
      workspace: selection === SUPER_ADMIN_SELECTION ? "" : selection,
      email,
      password,
      redirectTo: callbackUrl,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // NextAuth throws a redirect internally on success; let it propagate.
    throw error;
  }
}

/**
 * Everyone signs in with just email + password now. What used to be a
 * "Workspace" field on the form is resolved automatically:
 * - If the email + password is valid for exactly one account (the common
 *   case), sign straight in.
 * - If it's valid for a saved default workspace (see `setDefaultWorkspace`
 *   below / the picker's "remember this" checkbox), sign into that one.
 * - Otherwise, valid for more than one account — return the list so the form
 *   can show a "which one?" step. The confirm step re-submits with
 *   `selection` set, which goes straight to sign-in without re-deriving
 *   anything.
 */
export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const emailField = formData.get("email");
  const passwordField = formData.get("password");
  const callbackUrlField = formData.get("callbackUrl");
  const selectionField = formData.get("selection"); // populated only by the "confirm workspace" step
  const selectionWorkspaceIdField = formData.get("selectionWorkspaceId");
  const setDefaultField = formData.get("setDefault");

  const email = typeof emailField === "string" ? emailField.trim() : "";
  const password = typeof passwordField === "string" ? passwordField : "";
  const callbackUrl = typeof callbackUrlField === "string" && callbackUrlField ? callbackUrlField : "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Step 2: the user already picked a specific account from the list.
  if (typeof selectionField === "string" && selectionField) {
    // Must happen *before* signing in: on success, signIn() throws internally
    // to perform the redirect, so nothing after a successful call ever runs.
    if (
      selectionField !== SUPER_ADMIN_SELECTION &&
      setDefaultField === "on" &&
      typeof selectionWorkspaceIdField === "string" &&
      selectionWorkspaceIdField
    ) {
      await prisma.loginPreference.upsert({
        where: { email: email.toLowerCase() },
        update: { defaultWorkspaceId: selectionWorkspaceIdField },
        create: { email: email.toLowerCase(), defaultWorkspaceId: selectionWorkspaceIdField },
      });
    }

    const result = await trySignIn(selectionField, email, password, callbackUrl);
    if (result.error) {
      // Re-derive the picker so a rare failure here (e.g. the account was
      // deactivated between steps) doesn't lose the user's place.
      const candidates = await findLoginCandidates(email, password);
      return {
        error: result.error,
        candidates: candidates.length > 1 ? candidates.map(toOption) : undefined,
        email,
        password,
        callbackUrl,
      };
    }
    return result;
  }

  // Step 1: figure out how many accounts this email + password resolves to.
  const candidates = await findLoginCandidates(email, password);
  if (candidates.length === 0) {
    return { error: "Invalid email or password." };
  }

  if (candidates.length === 1) {
    const only = candidates[0];
    const selection = only.kind === "super-admin" ? SUPER_ADMIN_SELECTION : only.workspaceSlug;
    return trySignIn(selection, email, password, callbackUrl);
  }

  // Multiple accounts: honor a previously saved default workspace if it's still one of them.
  const preference = await prisma.loginPreference.findUnique({ where: { email: email.toLowerCase() } });
  if (preference?.defaultWorkspaceId) {
    const defaultMatch = candidates.find(
      (c) => c.kind === "workspace" && c.workspaceId === preference.defaultWorkspaceId
    );
    if (defaultMatch && defaultMatch.kind === "workspace") {
      return trySignIn(defaultMatch.workspaceSlug, email, password, callbackUrl);
    }
  }

  return {
    candidates: candidates.map(toOption),
    email,
    password,
    callbackUrl,
  };
}
