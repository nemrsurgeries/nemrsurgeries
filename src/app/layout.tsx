import type { Metadata } from "next";
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
} from "@/components/theme/theme-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getServerI18n } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OrthoCase — Orthopedic Surgical Case Management",
    template: "%s | OrthoCase",
  },
  description:
    "Private surgical case documentation, medical media organization, follow-up tracking, and selective colleague collaboration for orthopedic surgeons.",
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dir } = await getServerI18n();

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider>{children}</ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
