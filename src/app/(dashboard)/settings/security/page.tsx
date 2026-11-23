import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { SecuritySettings } from "@/components/users/security-settings";

export default async function SecuritySettingsPage() {
  const { user, sessionId } = await requireSession();

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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Security &amp; Sessions
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Protect your surgical library with strong credentials and session
          controls.
        </p>
      </div>
      <SecuritySettings userEmail={user.email} sessions={sessions} />
    </div>
  );
}
