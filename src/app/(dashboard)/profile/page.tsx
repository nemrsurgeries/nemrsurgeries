import { requireSession } from "@/modules/auth/session";
import { getServerI18n } from "@/lib/i18n/server";
import { ProfileForm } from "@/components/users/profile-form";

export default async function ProfilePage() {
  const [{ user }, { dict }] = await Promise.all([
    requireSession(),
    getServerI18n(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {dict.pages.profileTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {dict.pages.profileDesc}
        </p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
