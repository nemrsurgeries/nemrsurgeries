import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getServerSession } from "@/modules/auth/session";

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex items-center gap-2.5 text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight leading-none">
              OrthoCase
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Surgical Case Management
            </p>
          </div>
        </div>
        <div className="w-full">{children}</div>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-500">
        Private clinical documentation platform &middot; Invitation-only access
      </footer>
    </div>
  );
}
