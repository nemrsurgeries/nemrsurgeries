import { requireSession } from "@/modules/auth/session";
import { listSharedByMeCases } from "@/modules/sharing/service";
import { T } from "@/components/i18n/t";
import { SharedByMeClient } from "@/components/cases/shared-by-me-client";

export default async function SharedByMePage() {
  const { user } = await requireSession();
  const cases = await listSharedByMeCases(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <T k="pages.sharedByMeTitle" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <T k="pages.sharedByMeDesc" />
        </p>
      </div>

      <SharedByMeClient cases={cases} />
    </div>
  );
}
