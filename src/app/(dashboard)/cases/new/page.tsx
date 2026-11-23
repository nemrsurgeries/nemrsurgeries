import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { getServerI18n } from "@/lib/i18n/server";
import { CaseWizard } from "@/components/cases/case-wizard";
import { Button } from "@/components/ui/button";

export default async function NewCasePage() {
  const [{ user }, { dict }] = await Promise.all([
    requireSession(),
    getServerI18n(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ms-2 mb-1">
            <Link href="/cases">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {dict.detail.backToCases}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {dict.cases.newCasePageTitle}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {dict.cases.newCasePageDesc}
          </p>
        </div>
      </div>

      <CaseWizard
        mode="create"
        defaultHospital={user.hospital}
        defaultSurgeon={user.name}
      />
    </div>
  );
}
