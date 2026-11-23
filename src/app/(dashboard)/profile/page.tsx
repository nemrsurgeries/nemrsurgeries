import { requireSession } from "@/modules/auth/session";
import { ProfileForm } from "@/components/users/profile-form";

export default async function ProfilePage() {
  const { user } = await requireSession();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Profile
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your professional identity and institutional affiliation.
        </p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
