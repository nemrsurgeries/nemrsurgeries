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
import { CASE_STATUS_META, getCaseStatusLabel } from "@/modules/cases/labels";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { locale, dict } = useLocale();
  const isAr = locale === "ar";
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
        toast.error(
          res.error ??
            (isAr ? "تعذر تحديث الصلاحية." : "Unable to update permission."),
        );
        return;
      }
      toast.success(
        isAr
          ? `تم تحديث الصلاحية إلى ${permission}`
          : `Permission updated to ${permission}`,
      );
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
        toast.error(
          res.error ??
            (isAr ? "تعذر إلغاء صلاحية الوصول." : "Unable to revoke access."),
        );
        return;
      }
      toast.success(
        isAr
          ? `تم إلغاء صلاحية الوصول لـ ${recipientName}`
          : `Access revoked for ${recipientName}`,
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-3">
            <Share2 className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {dict.pages.sharedByMeEmpty}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? "افتح أي حالة جراحية في مكتبتك واضغط على «مشاركة» لمنح زميل صلاحية Viewer أو Editor."
              : "Open any surgical case in your library and click Share to grant Viewer or Editor access to a colleague."}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/cases">
              {isAr ? "الذهاب إلى حالاتي" : "Go to My Cases"}
            </Link>
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
                      className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      {c.caseNumber}
                    </Link>
                    <Badge variant={meta.variant}>
                      {getCaseStatusLabel(c.status, locale)}
                    </Badge>
                  </div>
                  <CardTitle className="mt-1 text-base">
                    <Link
                      href={`/cases/${c.id}`}
                      className="hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      {c.diagnosis || dict.dashboard.untitledDiagnosis}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {c.procedure || dict.common.none} &middot;{" "}
                    {formatDate(c.operationDate, undefined, locale)}
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/cases/${c.id}`}>
                    {isAr ? "فتح الحالة" : "Open Case"}
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {c.shares.length > 0 && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800">
                  {c.shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {share.sharedWith.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {share.sharedWith.email} &middot;{" "}
                          {formatDate(share.createdAt, undefined, locale)}
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
                          className="h-8 w-36 text-xs"
                        >
                          <option value="VIEWER">{dict.common.viewer}</option>
                          <option value="EDITOR">{dict.common.editor}</option>
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyId === share.id}
                          onClick={() =>
                            handleRevoke(c.id, share.id, share.sharedWith.name)
                          }
                          className="h-8 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          {isAr ? "إلغاء" : "Revoke"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {c.pendingShares.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isAr
                      ? "دعوات المشاركة المعلقة"
                      : "Pending share invitations"}
                  </p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    {c.pendingShares.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {p.invitation.email}
                        </span>
                        <Badge variant="outline">
                          {isAr ? "معلق" : "Pending"} ({p.permission}) &middot;{" "}
                          {formatDate(p.invitation.expiresAt, undefined, locale)}
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
