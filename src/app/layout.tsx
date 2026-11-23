import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OrthoCase — Orthopedic Surgical Case Management",
    template: "%s | OrthoCase",
  },
  description:
    "Private surgical case documentation, medical media organization, follow-up tracking, and selective colleague collaboration for orthopedic surgeons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
