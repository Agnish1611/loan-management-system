import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CreditSea — Borrower Portal",
    template: "%s | CreditSea",
  },
  description:
    "Apply for a personal loan, track your application, and manage repayments on the CreditSea Borrower Portal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
