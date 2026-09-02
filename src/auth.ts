import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findLoginCandidates } from "@/lib/login-candidates";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  // Required for self-hosted deployments (Docker, VPS, custom domains, etc.) —
  // without this, Auth.js only trusts a small list of known hosting providers and
  // rejects every request with an "UntrustedHost" error outside of local dev.
  trustHost: true,
  session: {
    strategy: "jwt",
    // Keep people signed in for a full year instead of the default 30 days —
    // this is an internal property-management tool, not a banking app, so
    // minimizing re-login prompts matters more than a short session.
    maxAge: 60 * 60 * 24 * 365,
    // Every visit within a week of the last one silently re-issues the
    // session for another full year, so an actively-used login effectively
    // never expires; only a full year of total inactivity signs someone out.
    updateAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        // "workspace" is no longer a field on the visible login form — everyone
        // signs in with just email + password. It's only ever supplied
        // internally: either by the login flow once it has figured out which
        // single workspace the credentials resolve to (see
        // app/login/actions.ts), or omitted entirely for the Super Admin.
        workspace: { label: "Workspace", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        const workspaceSlug =
          typeof credentials?.workspace === "string" ? credentials.workspace.trim().toLowerCase() : "";
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        if (workspaceSlug) {
          // Workspace-scoped login: admins/managers/staff/viewers all sign in this way.
          const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
          if (!workspace || !workspace.isActive) return null;

          const user = await prisma.user.findUnique({
            where: { workspaceId_email: { workspaceId: workspace.id, email: email.toLowerCase() } },
          });
          if (!user || !user.isActive) return null;

          const passwordsMatch = await compare(password, user.passwordHash);
          if (!passwordsMatch) return null;

          // Re-derive every other workspace (and/or the Super Admin account)
          // this same email + password is *also* valid for, independently
          // re-verifying each one's own password hash — this is what powers
          // the in-app "switch workspace" list, so it must never trust
          // anything other than a fresh DB + bcrypt check.
          const allCandidates = await findLoginCandidates(email, password);
          const availableWorkspaces = allCandidates
            .filter((c): c is Extract<typeof c, { kind: "workspace" }> => c.kind === "workspace")
            .map((c) => ({
              userId: c.userId,
              role: c.role,
              workspaceId: c.workspaceId,
              workspaceName: c.workspaceName,
              workspaceSlug: c.workspaceSlug,
            }));

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            workspaceId: user.workspaceId,
            workspaceName: workspace.name,
            availableWorkspaces,
          };
        }

        // No workspace given: only the platform super admin can sign in this way.
        const user = await prisma.user.findFirst({
          where: { workspaceId: null, email: email.toLowerCase(), role: "SUPER_ADMIN" },
        });
        if (!user || !user.isActive) return null;

        const passwordsMatch = await compare(password, user.passwordHash);
        if (!passwordsMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
          workspaceName: null,
          availableWorkspaces: [],
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
        token.workspaceName = user.workspaceName;
        token.availableWorkspaces = user.availableWorkspaces;
      }

      // Triggered by unstable_update() from the "switch workspace" server
      // action (swaps the active identity to one of the workspaces already
      // verified at original sign-in time, without needing the password
      // again) and from "create additional workspace" (appends the new
      // workspace to the list without changing the active identity).
      if (trigger === "update" && session?.user) {
        const target = session.user as {
          id?: string;
          role?: Role;
          workspaceId?: string;
          workspaceName?: string;
          availableWorkspaces?: typeof token.availableWorkspaces;
        };
        if (target.id) token.id = target.id;
        if (target.role) token.role = target.role;
        if (target.workspaceId) token.workspaceId = target.workspaceId;
        if (target.workspaceName) token.workspaceName = target.workspaceName;
        if (target.availableWorkspaces) token.availableWorkspaces = target.availableWorkspaces;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.workspaceId = (token.workspaceId ?? null) as string | null;
        session.user.workspaceName = (token.workspaceName ?? null) as string | null;
        session.user.availableWorkspaces = (token.availableWorkspaces ?? []) as typeof session.user.availableWorkspaces;
      }
      return session;
    },
  },
});
