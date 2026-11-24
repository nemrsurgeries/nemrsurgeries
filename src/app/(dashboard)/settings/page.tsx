import Link from "next/link";
import { Languages, Palette, Shield, User } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { T } from "@/components/i18n/t";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme/theme-toggle";
import { LanguageSelector } from "@/components/i18n/language-toggle";

export default async function SettingsPage() {
  const { user } = await requireSession();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <T k="pages.settingsTitle" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <T k="pages.settingsDesc" />
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Palette className="h-4 w-4" />
              <CardTitle>
                <T k="pages.appearanceTitle" />
              </CardTitle>
            </div>
            <CardDescription>
              <T k="pages.appearanceDesc" />
            </CardDescription>
          </div>
          <ThemeSelector />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Languages className="h-4 w-4" />
              <CardTitle>
                <T k="pages.languageTitle" />
              </CardTitle>
            </div>
            <CardDescription>
              <T k="pages.languageDesc" />
            </CardDescription>
          </div>
          <LanguageSelector />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <User className="h-4 w-4" />
              <CardTitle>
                <T k="pages.profileCardTitle" />
              </CardTitle>
            </div>
            <CardDescription>
              <T k="pages.profileCardDesc" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">
                <T k="pages.editProfileBtn" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Shield className="h-4 w-4" />
              <CardTitle>
                <T k="pages.securityCardTitle" />
              </CardTitle>
            </div>
            <CardDescription>
              <T k="pages.securityCardDesc" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/security">
                <T k="pages.securitySettingsBtn" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <T k="pages.privacyTitle" />
          </CardTitle>
          <CardDescription>
            <T k="pages.privacySignedInPrefix" /> {user.email}.{" "}
            <T k="pages.privacySignedInSuffix" />
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
          <p>
            <T k="pages.privacyBody" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
