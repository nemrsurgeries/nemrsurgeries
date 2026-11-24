import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getServerSession } from "@/modules/auth/session";
import { T } from "@/components/i18n/t";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/i18n/language-toggle";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Top Utility Bar (never overlaps brand header on small screens) */}
      <header className="flex w-full items-center justify-end gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </header>

      {/* Centered Auth Content */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-6 sm:py-10">
        <div className="mb-6 sm:mb-8 flex max-w-full items-center gap-2.5 text-slate-900 dark:text-slate-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight leading-none">
              <T k="brand.name" />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              <T k="brand.authSubtitle" />
            </p>
          </div>
        </div>
        <div className="w-full">{children}</div>
      </main>

      <footer className="pb-2 pt-4 text-center text-xs text-slate-500 dark:text-slate-400 text-balance">
        <T k="brand.authFooter" />
      </footer>
    </div>
  );
}
