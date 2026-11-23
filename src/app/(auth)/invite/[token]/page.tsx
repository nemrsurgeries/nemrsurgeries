import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { validateInvitationToken } from "@/modules/invitations/service";
import { InviteRegisterForm } from "@/components/auth/invite-register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateInvitationToken(token);

  if (!result.valid) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Invitation unavailable</CardTitle>
          </div>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Please contact the colleague who invited you to send a fresh
            invitation link.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Return to Sign In</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <InviteRegisterForm
      token={token}
      email={result.invitation.email}
      inviterName={result.invitation.inviterName}
      inviterHospital={result.invitation.inviterHospital}
      pendingShareCount={result.invitation.pendingShareCount}
    />
  );
}
