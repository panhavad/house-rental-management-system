import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

/** One workspace this login's email+password was independently verified against at sign-in time. */
type AvailableWorkspace = {
  userId: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      workspaceId: string | null;
      workspaceName: string | null;
      /** Every workspace (besides the active one) this same login can switch into without re-entering a password. */
      availableWorkspaces: AvailableWorkspace[];
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    workspaceId: string | null;
    workspaceName: string | null;
    availableWorkspaces: AvailableWorkspace[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    workspaceId?: string | null;
    workspaceName?: string | null;
    availableWorkspaces?: AvailableWorkspace[];
  }
}
