import { requireSession } from "@/modules/auth/session";
import { listUserInvitations } from "@/modules/invitations/service";
import { T } from "@/components/i18n/t";
import { InvitationsPanel } from "@/components/invitations/invitations-panel";

export default async function InvitationsPage() {
  const { user } = await requireSession();
  const invitations = await listUserInvitations(user.id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <T k="pages.invitationsTitle" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <T k="pages.invitationsDesc" />
        </p>
      </div>
      <InvitationsPanel invitations={invitations} />
    </div>
  );
}
