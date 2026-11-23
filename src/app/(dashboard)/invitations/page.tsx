import { requireSession } from "@/modules/auth/session";
import { listUserInvitations } from "@/modules/invitations/service";
import { getServerI18n } from "@/lib/i18n/server";
import { InvitationsPanel } from "@/components/invitations/invitations-panel";

export default async function InvitationsPage() {
  const [{ user }, { dict }] = await Promise.all([
    requireSession(),
    getServerI18n(),
  ]);
  const invitations = await listUserInvitations(user.id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {dict.pages.invitationsTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {dict.pages.invitationsDesc}
        </p>
      </div>
      <InvitationsPanel invitations={invitations} />
    </div>
  );
}
