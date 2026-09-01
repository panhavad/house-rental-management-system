"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app is installable ("Add to Home
 * Screen") on mobile browsers. Safe no-op during local development over
 * plain HTTP on non-localhost hosts, since browsers require a secure context.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures (e.g. unsupported browser, insecure origin).
    });
  }, []);

  return null;
}
