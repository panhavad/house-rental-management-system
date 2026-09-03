import type { Metadata, Viewport } from "next";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "RentalHRM",
  description: "Rental house management: apartments, rooms, contracts, utilities and payments.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "RentalHRM",
    statusBarStyle: "black-translucent",
    capable: true,
  },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {/* Subtle top-of-page progress bar for page navigations — gives feedback without a
            blocking spinner or layout shift, matching the site's slate color scheme. */}
        <NextTopLoader color="#0f172a" height={2.5} showSpinner={false} shadow={false} />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
