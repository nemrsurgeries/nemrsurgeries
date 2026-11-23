import { requireSession } from "@/modules/auth/session";
import { listSharedByMeCases } from "@/modules/sharing/service";
import { getServerI18n } from "@/lib/i18n/server";
import { SharedByMeClient } from "@/components/cases/shared-by-me-client";

export default async function SharedByMePage() {
  const [{ user }, { dict }] = await Promise.all([
    requireSession(),
    getServerI18n(),
  ]);
  const cases = await listSharedByMeCases(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {dict.pages.sharedByMeTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {dict.pages.sharedByMeDesc}
        </p>
      </div>

      <SharedByMeClient cases={cases} />
    </div>
  );
}
