"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAction } from "@/modules/users/actions";
import type { AuthenticatedUser } from "@/modules/auth/session";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { locale, dict } = useLocale();
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
        toast.error(
          res.error ??
            (locale === "ar"
              ? "تعذر تحديث الملف الشخصي."
              : "Unable to update profile."),
        );
        return;
      }
      toast.success(
        locale === "ar" ? "تم تحديث الملف الشخصي" : "Profile updated",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.pages.profileCardTitle}</CardTitle>
        <CardDescription>{dict.pages.profileCardDesc}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">
                {locale === "ar" ? "الاسم الكامل" : "Full name"}
              </Label>
              <Input
                id="profile-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">{dict.auth.emailLabel}</Label>
              <Input id="profile-email" value={user.email} disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-title">
                {locale === "ar" ? "المسمى المهني" : "Professional title"}
              </Label>
              <Input
                id="profile-title"
                placeholder={
                  locale === "ar"
                    ? "مثال: استشاري جراحة العظام"
                    : "e.g. Consultant Orthopedic Surgeon"
                }
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-hospital">{dict.wizard.hospital}</Label>
              <Input
                id="profile-hospital"
                placeholder={locale === "ar" ? "اختياري" : "Optional"}
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            {locale === "ar" ? "تاريخ إنشاء الحساب" : "Account created on"}{" "}
            {formatDate(user.createdAt, undefined, locale)} &middot;{" "}
            {locale === "ar" ? "حالة البريد:" : "Email status:"}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {user.emailVerified
                ? locale === "ar"
                  ? "مُفعّل"
                  : "Verified"
                : locale === "ar"
                  ? "غير مُفعّل"
                  : "Unverified"}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {dict.common.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {dict.common.save}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
