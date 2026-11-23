import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { CaseWizard } from "@/components/cases/case-wizard";
import { Button } from "@/components/ui/button";

export default async function NewCasePage() {
  const { user } = await requireSession();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ms-2 mb-1">
            <Link href="/cases">
              <ArrowLeft className="h-4 w-4" />
              Back to My Cases
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            New Surgical Case
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete the structured sections below. Incomplete drafts can be
            saved at any time.
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
