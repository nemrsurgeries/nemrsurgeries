"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/modules/auth/auth-client";
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

export default function LoginPage() {
  const router = useRouter();
  const { dict } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        setError(result.error.message ?? dict.auth.invalidCredentials);
        return;
      }

      toast.success(dict.auth.signInSuccess);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(dict.auth.signInError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.signInTitle}</CardTitle>
        <CardDescription>{dict.auth.signInDesc}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 dark:border-red-800/70 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">{dict.auth.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dr.name@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{dict.auth.passwordLabel}</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                {dict.auth.forgotPasswordLink}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="pe-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? dict.auth.hidePassword
                    : dict.auth.showPassword
                }
                className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {dict.auth.signingInBtn}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {dict.auth.signInBtn}
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {dict.auth.inviteOnlyHint}{" "}
            <Link
              href="/register"
              className="font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              {dict.auth.useInvitation}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
