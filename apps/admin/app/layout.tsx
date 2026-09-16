import type { Metadata, Viewport } from "next";
import { ApiProvider } from "@/lib/ApiProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CreditSea — Ops Dashboard",
    template: "%s | CreditSea Ops",
  },
  description:
    "Operations dashboard for Sales, Sanction, Disbursement, Collection, and Admin teams.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ApiProvider>{children}</ApiProvider>
      </body>
    </html>
  );
}
