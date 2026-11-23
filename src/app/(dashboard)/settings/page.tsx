import Link from "next/link";
import { Shield, User } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const { user } = await requireSession();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your personal library preferences, profile, and account
          security.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <User className="h-4 w-4" />
              <CardTitle>Professional Profile</CardTitle>
            </div>
            <CardDescription>
              Update your name, title, and hospital affiliation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <Shield className="h-4 w-4" />
              <CardTitle>Security &amp; Sessions</CardTitle>
            </div>
            <CardDescription>
              Change password, review active sessions, or delete your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/security">Security Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Privacy Notice</CardTitle>
          <CardDescription>
            Signed in as {user.email}. All surgical cases you create are private
            to your account unless explicitly shared with a colleague.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>
            Do not store patient names, national IDs, or phone numbers in case
            records. Ensure X-rays and clinical photographs are de-identified
            prior to upload.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
