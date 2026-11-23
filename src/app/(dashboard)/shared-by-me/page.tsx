import { requireSession } from "@/modules/auth/session";
import { listSharedByMeCases } from "@/modules/sharing/service";
import { SharedByMeClient } from "@/components/cases/shared-by-me-client";

export default async function SharedByMePage() {
  const { user } = await requireSession();
  const cases = await listSharedByMeCases(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Shared by Me
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage colleague access across your personally owned surgical cases.
          Revoking access removes visibility immediately.
        </p>
      </div>

      <SharedByMeClient cases={cases} />
    </div>
  );
}
