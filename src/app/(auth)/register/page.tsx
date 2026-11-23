import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (token && token.trim().length > 0) {
    redirect(`/invite/${encodeURIComponent(token.trim())}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-blue-700">
          <MailCheck className="h-5 w-5" />
          <CardTitle>Invitation required</CardTitle>
        </div>
        <CardDescription>
          OrthoCase is an invitation-only clinical case management platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <p>
          To create your personal surgical case library, open the single-use
          invitation link sent to your email by a registered colleague.
        </p>
        <p className="text-xs text-slate-500">
          Joining via an invitation gives you an independent private account.
          Other doctors&apos; cases remain private unless explicitly shared.
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to Sign In</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
