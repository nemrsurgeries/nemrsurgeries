"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { authClient } from "@/modules/auth/auth-client";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: "/reset-password",
      });
      setSubmitted(true);
    } catch {
      setError("Unable to process password reset right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your registered email address and we will send you a recovery
          link.
        </CardDescription>
      </CardHeader>

      {submitted ? (
        <CardContent className="space-y-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            If an account exists for <strong>{email}</strong>, a password reset
            link has been sent. Please check your inbox.
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                required
                placeholder="dr.name@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send reset link
                </>
              )}
            </Button>
            <Link
              href="/login"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Back to Sign In
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
