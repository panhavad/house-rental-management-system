/** Sentinel passed through the login form to mean "the platform Super Admin", since that account has no workspace slug. */
export const SUPER_ADMIN_SELECTION = "__super_admin__";

export type LoginCandidateOption =
  | { kind: "super-admin"; label: string }
  | { kind: "workspace"; label: string; role: string; workspaceSlug: string; workspaceId: string };

export type LoginState = {
  error?: string;
  /** Set when this email + password matches more than one account — the form should show a picker instead of signing in. */
  candidates?: LoginCandidateOption[];
  email?: string;
  password?: string;
  callbackUrl?: string;
};
