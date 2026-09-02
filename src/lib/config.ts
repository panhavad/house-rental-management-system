/**
 * Whether the public `/signup` page (self-service workspace + administrator
 * creation) is reachable. Controlled by the `ALLOW_SELF_SIGNUP` environment
 * variable so it can be locked down per-deployment without a code change.
 *
 * Defaults to **enabled** when the variable isn't set at all, so local
 * development and the plain `npm run start` production path keep working
 * exactly as before. The Docker template (`.env.docker.example` /
 * `docker-compose.yml`) ships with it explicitly set to `false`, since a
 * typical production deployment wants the Super Admin to be the only one who
 * can create new workspaces/users.
 */
export function isSelfSignupEnabled(): boolean {
  return process.env.ALLOW_SELF_SIGNUP !== "false";
}
