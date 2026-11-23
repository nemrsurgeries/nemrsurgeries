"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAction } from "@/modules/users/actions";
import type { AuthenticatedUser } from "@/modules/auth/session";
import { formatDate } from "@/lib/utils";
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

export function ProfileForm({ user }: { user: AuthenticatedUser }) {
  const [name, setName] = useState(user.name);
  const [professionalTitle, setProfessionalTitle] = useState(
    user.professionalTitle ?? "",
  );
  const [hospital, setHospital] = useState(user.hospital ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfileAction({
        name,
        professionalTitle,
        hospital,
      });
      if (!res.success) {
        toast.error(res.error ?? "Unable to update profile.");
        return;
      }
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Profile</CardTitle>
        <CardDescription>
          This information identifies you when you share surgical cases or send
          invitations.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email address</Label>
              <Input id="profile-email" value={user.email} disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-title">Professional title</Label>
              <Input
                id="profile-title"
                placeholder="e.g. Consultant Orthopedic Surgeon"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-hospital">Hospital / Institution</Label>
              <Input
                id="profile-hospital"
                placeholder="Optional"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Account created on {formatDate(user.createdAt)} &middot; Email
            status:{" "}
            <span className="font-medium text-slate-900">
              {user.emailVerified ? "Verified" : "Unverified"}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
