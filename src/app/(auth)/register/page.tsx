import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
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
  const [{ token }, { dict }] = await Promise.all([
    searchParams,
    getServerI18n(),
  ]);

  if (token && token.trim().length > 0) {
    redirect(`/invite/${encodeURIComponent(token.trim())}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <MailCheck className="h-5 w-5" />
          <CardTitle>{dict.auth.registerTitle}</CardTitle>
        </div>
        <CardDescription>{dict.auth.registerDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <p>{dict.auth.registerBody}</p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{dict.auth.backToSignIn}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
