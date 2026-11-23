import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { getServerI18n } from "@/lib/i18n/server";
import { SecuritySettings } from "@/components/users/security-settings";

export default async function SecuritySettingsPage() {
  const [{ user, sessionId }, { dict }] = await Promise.all([
    requireSession(),
    getServerI18n(),
  ]);

  const rawSessions = await db.session.findMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  const sessions = rawSessions.map((s) => ({
    ...s,
    isCurrent: s.id === sessionId,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {dict.pages.securityPageTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {dict.pages.securityPageDesc}
        </p>
      </div>
      <SecuritySettings userEmail={user.email} sessions={sessions} />
    </div>
  );
}
