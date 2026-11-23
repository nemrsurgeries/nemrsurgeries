"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
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

interface InviteRegisterFormProps {
  token: string;
  email: string;
  inviterName: string;
  inviterHospital: string | null;
  pendingShareCount: number;
}

export function InviteRegisterForm({
  token,
  email,
  inviterName,
  inviterHospital,
  pendingShareCount,
}: InviteRegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [hospital, setHospital] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          password,
          professionalTitle,
          hospital,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to complete registration.");
        return;
      }

      toast.success("Account created. Welcome to OrthoCase.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while creating your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your doctor account</CardTitle>
        <CardDescription>
          Invited by <span className="font-medium text-slate-800 dark:text-slate-200">{inviterName}</span>
          {inviterHospital ? ` (${inviterHospital})` : ""}. Your account includes
          your own private surgical case library.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {pendingShareCount > 0 && (
            <div className="rounded-md border border-blue-200 dark:border-blue-800/70 bg-blue-50 dark:bg-blue-950/50 px-3 py-2 text-xs text-blue-800 dark:text-blue-300">
              {pendingShareCount === 1
                ? "1 surgical case will be shared with you automatically once you complete registration."
                : `${pendingShareCount} surgical cases will be shared with you automatically once you complete registration.`}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 dark:border-red-800/70 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Invited email</Label>
            <Input id="invite-email" type="email" value={email} disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              placeholder="Dr. Ahmed Hassan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Professional title</Label>
              <Input
                id="title"
                placeholder="Orthopedic Specialist"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hospital">Hospital / Institution</Label>
              <Input
                id="hospital"
                placeholder="Optional"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              placeholder="Minimum 10 chars, upper/lower/number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Complete Registration
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
