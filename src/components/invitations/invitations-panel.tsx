"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MailPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  createInvitationAction,
  revokeInvitationAction,
} from "@/modules/invitations/actions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InvitationRow {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  pendingShares: {
    id: string;
    permission: "VIEWER" | "EDITOR";
    surgicalCase: { id: string; caseNumber: string };
  }[];
}

export function InvitationsPanel({
  invitations,
}: {
  invitations: InvitationRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setDevInviteUrl(null);
    try {
      const res = await createInvitationAction({ email });
      if (!res.success) {
        toast.error(res.error ?? "Unable to send invitation.");
        return;
      }
      setEmail("");
      if (res.inviteUrl) {
        setDevInviteUrl(res.inviteUrl);
      }
      toast.success("Invitation sent");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(id: string) {
    const res = await revokeInvitationAction(id);
    if (!res.success) {
      toast.error(res.error ?? "Unable to revoke invitation.");
      return;
    }
    toast.success("Invitation revoked");
    router.refresh();
  }

  function statusVariant(status: InvitationRow["status"]) {
    switch (status) {
      case "ACCEPTED":
        return "success";
      case "PENDING":
        return "default";
      case "REVOKED":
        return "destructive";
      case "EXPIRED":
        return "secondary";
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite a Colleague</CardTitle>
          <CardDescription>
            Send a single-use invitation link. The invited doctor will receive
            their own independent private case library and will not see your
            cases unless you explicitly share them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleInvite}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="colleague-email">Doctor&apos;s email address</Label>
              <Input
                id="colleague-email"
                type="email"
                required
                placeholder="colleague@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailPlus className="h-4 w-4" />
              )}
              Send Invitation
            </Button>
          </form>

          {devInviteUrl && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-medium mb-1">
                Development invitation link (also logged to server console):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-2 py-1 border border-blue-200">
                  {devInviteUrl}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(devInviteUrl);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Invitations</CardTitle>
          <CardDescription>
            Track pending, accepted, expired, and revoked invitations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              You have not sent any invitations yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-start text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 pe-4 text-start">Recipient</th>
                    <th className="py-2.5 pe-4 text-start">Status</th>
                    <th className="py-2.5 pe-4 text-start">Expires</th>
                    <th className="py-2.5 pe-4 text-start">Pending Shares</th>
                    <th className="py-2.5 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 pe-4 font-medium text-slate-900">
                        {inv.email}
                      </td>
                      <td className="py-3 pe-4">
                        <Badge variant={statusVariant(inv.status)}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 pe-4 text-slate-600">
                        {formatDate(inv.expiresAt)}
                      </td>
                      <td className="py-3 pe-4 text-slate-600">
                        {inv.pendingShares.length > 0
                          ? inv.pendingShares
                              .map((p) => p.surgicalCase.caseNumber)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="py-3 text-end">
                        {inv.status === "PENDING" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
