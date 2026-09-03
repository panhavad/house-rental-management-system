/** @type {import('next').NextConfig} */

/**
 * Hostnames allowed to invoke Server Actions.
 *
 * Next.js rejects a Server Action when the request's `Origin` doesn't match the
 * `Host`/`X-Forwarded-Host` it sees. Behind a reverse proxy that terminates TLS on
 * a public domain but forwards to the container over plain HTTP — a Cloudflare
 * Tunnel, for example — the browser sends `Origin: https://app.example.com` while
 * the container may see a rewritten host, and every form submit (including file
 * uploads) fails with "does not match `origin` header ... Aborting the action".
 *
 * The public URL is already configured as `NEXTAUTH_URL`, so it is trusted
 * automatically; `ALLOWED_ORIGINS` (comma-separated) covers any extra domain the
 * deployment is reachable at. Entries may be full URLs or bare hostnames, and
 * `next.config.js` is re-read when the server boots, so these can be changed
 * through the environment without rebuilding the image.
 */
function serverActionOrigins() {
  const entries = [process.env.NEXTAUTH_URL, ...(process.env.ALLOWED_ORIGINS || "").split(",")];
  const hosts = new Set();

  for (const entry of entries) {
    const value = (entry || "").trim();
    if (!value) continue;
    try {
      hosts.add(new URL(value.includes("://") ? value : `https://${value}`).host);
    } catch {
      // Ignore malformed entries instead of taking the whole server down.
    }
  }

  return [...hosts];
}

const nextConfig = {
  experimental: {
    serverActions: {
      // Allows contract document uploads (PDF/image) up to 10MB.
      bodySizeLimit: "10mb",
      allowedOrigins: serverActionOrigins(),
    },
  },
};

module.exports = nextConfig;
