"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound, Loader2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/modules/auth/auth-client";
import {
  deleteAccountAction,
  revokeOtherSessionsAction,
  revokeSessionByIdAction,
} from "@/modules/users/actions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export function SecuritySettings({
  userEmail,
  sessions,
}: {
  userEmail: string;
  sessions: SessionItem[];
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [revokingAll, setRevokingAll] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 10) {
      toast.error("New password must be at least 10 characters.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (res.error) {
        toast.error(res.error.message ?? "Unable to change password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed and other sessions signed out.");
      router.refresh();
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleRevokeOthers() {
    setRevokingAll(true);
    try {
      const res = await revokeOtherSessionsAction();
      if (!res.success) {
        toast.error(res.error ?? "Unable to revoke sessions.");
        return;
      }
      toast.success(
        `Signed out ${res.data?.revokedCount ?? 0} other active session(s).`,
      );
      router.refresh();
    } finally {
      setRevokingAll(false);
    }
  }

  async function handleRevokeSingle(id: string) {
    const res = await revokeSessionByIdAction(id);
    if (!res.success) {
      toast.error(res.error ?? "Unable to revoke session.");
      return;
    }
    toast.success("Session revoked");
    router.refresh();
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    try {
      const res = await deleteAccountAction({
        confirmEmail,
        confirmPhrase,
      });
      if (!res.success) {
        toast.error(res.error ?? "Account deletion failed.");
        return;
      }
      toast.success("Account permanently deleted.");
      router.push("/login");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Updating your password automatically signs out all other devices.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Update Password
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Devices currently signed into your account.
            </CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeOthers}
              disabled={revokingAll}
            >
              <LogOut className="h-4 w-4" />
              Sign out other devices
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {s.userAgent
                        ? s.userAgent.slice(0, 72)
                        : "Browser session"}
                    </p>
                    {s.isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {`IP: ${s.ipAddress ?? "Unknown"} · Started ${formatDate(s.createdAt)} · Expires ${formatDate(s.expiresAt)}`}
                  </p>
                </div>
                {!s.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSingle(s.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone: Account Deletion */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <CardTitle className="text-red-700">Delete Account</CardTitle>
          </div>
          <CardDescription>
            Permanently deletes your account, all personally owned surgical
            cases, attachments, and active shares. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleDeleteAccount}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="confirm-email">
                  Confirm your email ({userEmail})
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  required
                  placeholder={userEmail}
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-phrase">
                  Type DELETE MY ACCOUNT
                </Label>
                <Input
                  id="confirm-phrase"
                  required
                  placeholder="DELETE MY ACCOUNT"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" variant="destructive" disabled={deleting}>
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Permanently Delete Account
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
