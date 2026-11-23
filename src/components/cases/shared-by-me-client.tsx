"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Share2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { CaseStatus, SharePermission } from "@prisma/client";
import {
  revokeCaseShareAction,
  updateCaseSharePermissionAction,
} from "@/modules/sharing/actions";
import { CASE_STATUS_META } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface SharedByMeCaseItem {
  id: string;
  caseNumber: string;
  diagnosis: string | null;
  procedure: string | null;
  status: CaseStatus;
  operationDate: Date | null;
  shares: {
    id: string;
    permission: SharePermission;
    createdAt: Date;
    sharedWith: {
      id: string;
      name: string;
      email: string;
      professionalTitle: string | null;
      hospital: string | null;
    };
  }[];
  pendingShares: {
    id: string;
    permission: SharePermission;
    createdAt: Date;
    invitation: {
      id: string;
      email: string;
      expiresAt: Date;
    };
  }[];
}

export function SharedByMeClient({ cases }: { cases: SharedByMeCaseItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handlePermissionChange(
    caseId: string,
    shareId: string,
    permission: SharePermission,
  ) {
    setBusyId(shareId);
    try {
      const res = await updateCaseSharePermissionAction({
        caseId,
        shareId,
        permission,
      });
      if (!res.success) {
        toast.error(res.error ?? "Unable to update permission.");
        return;
      }
      toast.success(`Permission updated to ${permission}`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(
    caseId: string,
    shareId: string,
    recipientName: string,
  ) {
    setBusyId(shareId);
    try {
      const res = await revokeCaseShareAction({ caseId, shareId });
      if (!res.success) {
        toast.error(res.error ?? "Unable to revoke access.");
        return;
      }
      toast.success(`Access revoked for ${recipientName}`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
            <Share2 className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            You haven&apos;t shared any cases yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Open any surgical case in your library and click{" "}
            <strong>Share</strong> to grant Viewer or Editor access to a
            colleague.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/cases">Go to My Cases</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((c) => {
        const meta = CASE_STATUS_META[c.status];
        return (
          <Card key={c.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cases/${c.id}`}
                      className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                    >
                      {c.caseNumber}
                    </Link>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <CardTitle className="mt-1 text-base">
                    <Link
                      href={`/cases/${c.id}`}
                      className="hover:text-blue-700"
                    >
                      {c.diagnosis || "Untitled diagnosis"}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {c.procedure || "No procedure recorded"} &middot; Operation{" "}
                    {formatDate(c.operationDate)}
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/cases/${c.id}`}>Open Case</Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {c.shares.length > 0 && (
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {c.shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {share.sharedWith.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {share.sharedWith.email} &middot; Shared{" "}
                          {formatDate(share.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <NativeSelect
                          value={share.permission}
                          disabled={busyId === share.id}
                          onChange={(e) =>
                            handlePermissionChange(
                              c.id,
                              share.id,
                              e.target.value as SharePermission,
                            )
                          }
                          className="h-8 w-28 text-xs"
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyId === share.id}
                          onClick={() =>
                            handleRevoke(c.id, share.id, share.sharedWith.name)
                          }
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {c.pendingShares.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500">
                    Pending share invitations
                  </p>
                  <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-slate-50">
                    {c.pendingShares.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-800">
                          {p.invitation.email}
                        </span>
                        <Badge variant="outline">
                          Pending ({p.permission}) &middot; Expires{" "}
                          {formatDate(p.invitation.expiresAt)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
