import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required for self-hosted deployments (Docker, VPS, custom domains, etc.) —
  // without this, Auth.js only trusts a small list of known hosting providers and
  // rejects every request with an "UntrustedHost" error outside of local dev.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
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

        let user;
        let workspaceName: string | null = null;

        if (workspaceSlug) {
          // Workspace-scoped login: admins/managers/staff/viewers all sign in this way.
          const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
          if (!workspace || !workspace.isActive) return null;

          user = await prisma.user.findUnique({
            where: { workspaceId_email: { workspaceId: workspace.id, email: email.toLowerCase() } },
          });
          workspaceName = workspace.name;
        } else {
          // No workspace given: only the platform super admin can sign in this way.
          user = await prisma.user.findFirst({
            where: { workspaceId: null, email: email.toLowerCase(), role: "SUPER_ADMIN" },
          });
        }

        if (!user || !user.isActive) return null;

        const passwordsMatch = await compare(password, user.passwordHash);
        if (!passwordsMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
          workspaceName,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
        token.workspaceName = user.workspaceName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.workspaceId = (token.workspaceId ?? null) as string | null;
        session.user.workspaceName = (token.workspaceName ?? null) as string | null;
      }
      return session;
    },
  },
});
