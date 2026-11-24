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
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute end-4 top-4 sm:end-6 sm:top-6 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight leading-none">
              <T k="brand.name" />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <T k="brand.authSubtitle" />
            </p>
          </div>
        </div>
        <div className="w-full">{children}</div>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
        <T k="brand.authFooter" />
      </footer>
    </div>
  );
}
