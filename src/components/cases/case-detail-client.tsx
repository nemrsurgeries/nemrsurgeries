"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Activity,
  Archive,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Edit3,
  FileDown,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Share2,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AuditAction,
  CaseStatus,
  ImplantType,
  MediaCategory,
  PatientSex,
  SharePermission,
  SurgicalRole,
} from "@prisma/client";
import type { EffectiveCaseRole } from "@/modules/authorization/policy";
import type { PostoperativePlan } from "@/modules/cases/schemas";
import {
  deleteCaseAction,
  updateCaseStatusAction,
} from "@/modules/cases/actions";
import {
  AUDIT_ACTION_LABELS,
  CASE_STATUS_META,
  IMPLANT_TYPE_LABELS,
  PATIENT_SEX_LABELS,
  SURGICAL_ROLE_LABELS,
} from "@/modules/cases/labels";
import { CaseMediaPanel } from "@/components/media/case-media-panel";
import { CaseLabsPanel } from "@/components/cases/case-labs-panel";
import { CaseFollowupsPanel } from "@/components/cases/case-followups-panel";
import { ShareCaseModal } from "@/components/cases/share-case-modal";
import { ExportPdfModal } from "@/components/cases/export-pdf-modal";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface CaseDetailViewData {
  id: string;
  caseNumber: string;
  operationDate: Date | null;
  patientAge: number | null;
  patientSex: PatientSex;
  diagnosis: string | null;
  procedure: string | null;
  fractureClassification: string | null;
  classificationSystem: string | null;
  surgeon: string | null;
  myRole: SurgicalRole | null;
  seniorSurgeon: string | null;
  hospital: string | null;
  intraoperativeNotes: string | null;
  postoperativePlan: PostoperativePlan;
  learningPoints: string | null;
  status: CaseStatus;
  nextFollowupDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string;
    email: string;
    professionalTitle: string | null;
    hospital: string | null;
  };
  implants: {
    id: string;
    implantType: ImplantType;
    manufacturer: string | null;
    model: string | null;
    specifications: string | null;
    notes: string | null;
  }[];
  followups: {
    id: string;
    followupDate: Date;
    clinicalOutcome: string | null;
    radiologicalOutcome: string | null;
    complications: string | null;
    notes: string | null;
    author: { id: string; name: string } | null;
  }[];
  media: {
    id: string;
    category: MediaCategory;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    description: string | null;
    exifStripped: boolean;
    uploadedBy: string | null;
    createdAt: Date;
    uploader?: { id: string; name: string } | null;
  }[];
  labResults: {
    id: string;
    testName: string;
    result: string;
    unit: string | null;
    referenceRange: string | null;
    testDate: Date;
    notes: string | null;
    attachmentId: string | null;
    attachment?: {
      id: string;
      originalFilename: string;
      mimeType: string;
    } | null;
  }[];
  shares: {
    id: string;
    permission: SharePermission;
    sharedWith: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  pendingShares: {
    id: string;
    permission: SharePermission;
    invitation: {
      id: string;
      email: string;
      expiresAt: Date;
    };
  }[];
  auditLogs: {
    id: string;
    action: AuditAction;
    createdAt: Date;
    user: { id: string; name: string } | null;
  }[];
}

interface CaseDetailClientProps {
  data: CaseDetailViewData;
  role: Exclude<EffectiveCaseRole, "NONE">;
  currentUserId: string;
}

export function CaseDetailClient({
  data,
  role,
  currentUserId,
}: CaseDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CaseStatus>(data.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const isOwner = role === "OWNER";
  const canEdit = role === "OWNER" || role === "EDITOR";
  const statusMeta = CASE_STATUS_META[status];

  async function handleStatusChange(nextStatus: CaseStatus) {
    setUpdatingStatus(true);
    try {
      const res = await updateCaseStatusAction({
        caseId: data.id,
        status: nextStatus,
      });
      if (!res.success) {
        toast.error(res.error ?? "Unable to update status.");
        return;
      }
      setStatus(nextStatus);
      toast.success(`Status updated to ${CASE_STATUS_META[nextStatus].label}`);
      router.refresh();
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await deleteCaseAction(data.id);
      if (!res.success) {
        toast.error(res.error ?? "Unable to delete case.");
        return;
      }
      toast.success(`Case ${data.caseNumber} deleted`);
      setDeleteOpen(false);
      router.push("/cases");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const tabItems = [
    { value: "overview", label: "Overview", icon: ClipboardList },
    { value: "documentation", label: "Surgical Docs", icon: FileText },
    {
      value: "implants",
      label: `Implants (${data.implants.length})`,
      icon: Wrench,
    },
    {
      value: "media",
      label: `Images (${data.media.length})`,
      icon: ImageIcon,
    },
    {
      value: "labs",
      label: `Labs (${data.labResults.length})`,
      icon: FlaskConical,
    },
    {
      value: "followup",
      label: `Follow-up (${data.followups.length})`,
      icon: CalendarClock,
    },
    { value: "learning", label: "Learning Points", icon: BookOpen },
    { value: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link href={isOwner ? "/cases" : "/shared"}>
          <ArrowLeft className="h-4 w-4" />
          {isOwner ? "Back to My Cases" : "Back to Shared with Me"}
        </Link>
      </Button>

      {/* Clinical Header */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 rounded px-2 py-0.5">
                  {data.caseNumber}
                </span>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                {!isOwner && (
                  <Badge variant="outline">Shared ({role})</Badge>
                )}
                {isOwner && data.shares.length > 0 && (
                  <Badge variant="secondary">
                    Shared with {data.shares.length} colleague
                    {data.shares.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {data.diagnosis || "Untitled Surgical Case"}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {data.procedure || "No procedure recorded"}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Operation: {formatDate(data.operationDate)}</span>
                <span>Owner: {data.owner.name}</span>
                {data.hospital && <span>Hospital: {data.hospital}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canEdit && (
                <NativeSelect
                  value={status}
                  disabled={updatingStatus}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as CaseStatus)
                  }
                  aria-label="Change case status"
                  className="h-9 w-44 text-xs"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="AWAITING_FOLLOWUP">Awaiting Follow-up</option>
                  <option value="COMPLETED">Completed</option>
                  {isOwner && <option value="ARCHIVED">Archived</option>}
                </NativeSelect>
              )}

              {canEdit && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/cases/${data.id}/edit`}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>

              {isOwner && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}

              {isOwner && status !== "ARCHIVED" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("ARCHIVED")}
                  title="Archive case"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}

              {isOwner && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                  title="Delete case"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8 Navigation Tabs */}
      <Tabs.Root defaultValue="overview" className="space-y-4">
        <Tabs.List className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {/* Tab 1: Overview */}
        <Tabs.Content value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>General &amp; Demographics</CardTitle>
                <CardDescription>
                  De-identified patient and case metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Case ID</p>
                  <p className="font-mono font-medium">{data.caseNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Operation Date</p>
                  <p className="font-medium">
                    {formatDate(data.operationDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Patient Age</p>
                  <p className="font-medium">
                    {data.patientAge !== null ? `${data.patientAge} years` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Patient Sex</p>
                  <p className="font-medium">
                    {PATIENT_SEX_LABELS[data.patientSex]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Next Follow-up</p>
                  <p className="font-medium">
                    {formatDate(data.nextFollowupDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last Updated</p>
                  <p className="font-medium">{formatDate(data.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Diagnosis &amp; Surgical Team</CardTitle>
                <CardDescription>
                  Classification and operative team roles.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fracture Classification
                  </p>
                  <p className="font-medium">
                    {data.fractureClassification || "—"}
                    {data.classificationSystem
                      ? ` (${data.classificationSystem})`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Responsible Surgeon</p>
                  <p className="font-medium">{data.surgeon || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">My Role</p>
                  <p className="font-medium">
                    {data.myRole ? SURGICAL_ROLE_LABELS[data.myRole] : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Senior Surgeon</p>
                  <p className="font-medium">{data.seniorSurgeon || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Hospital</p>
                  <p className="font-medium">{data.hospital || "—"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Tabs.Content>

        {/* Tab 2: Surgical Documentation */}
        <Tabs.Content value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intraoperative Notes</CardTitle>
              <CardDescription>
                Surgical approach, operative steps, observations, and
                complications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.intraoperativeNotes ? (
                <div
                  className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100 [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-2"
                  dangerouslySetInnerHTML={{
                    __html: data.intraoperativeNotes,
                  }}
                />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No intraoperative notes recorded yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Postoperative Plan</CardTitle>
              <CardDescription>
                Documented treating surgeon&apos;s postoperative instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Weight-Bearing Instructions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  {data.postoperativePlan.weightBearing || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Rehabilitation Plan
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  {data.postoperativePlan.rehabilitationPlan || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Medication Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  {data.postoperativePlan.medicationNotes || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Follow-up Instructions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  {data.postoperativePlan.followupInstructions || "—"}
                </p>
              </div>
              {data.postoperativePlan.additionalNotes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Additional Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                    {data.postoperativePlan.additionalNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        {/* Tab 3: Implants */}
        <Tabs.Content value="implants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Instruments &amp; Implants</CardTitle>
                <CardDescription>
                  Fixation hardware documented for this surgical case.
                </CardDescription>
              </div>
              {canEdit && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/cases/${data.id}/edit`}>Manage Implants</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {data.implants.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No implants recorded for this case.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-2 pe-4 text-start">Type</th>
                        <th className="py-2 pe-4 text-start">Manufacturer</th>
                        <th className="py-2 pe-4 text-start">Model</th>
                        <th className="py-2 pe-4 text-start">Specifications</th>
                        <th className="py-2 text-start">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.implants.map((imp) => (
                        <tr key={imp.id}>
                          <td className="py-2.5 pe-4 font-medium">
                            {IMPLANT_TYPE_LABELS[imp.implantType]}
                          </td>
                          <td className="py-2.5 pe-4 text-slate-700 dark:text-slate-300">
                            {imp.manufacturer || "—"}
                          </td>
                          <td className="py-2.5 pe-4 text-slate-700 dark:text-slate-300">
                            {imp.model || "—"}
                          </td>
                          <td className="py-2.5 pe-4 text-slate-700 dark:text-slate-300">
                            {imp.specifications || "—"}
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">
                            {imp.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        {/* Tab 4: Medical Images */}
        <Tabs.Content value="media">
          <CaseMediaPanel
            caseId={data.id}
            currentUserId={currentUserId}
            role={role}
            media={data.media}
          />
        </Tabs.Content>

        {/* Tab 5: Laboratories */}
        <Tabs.Content value="labs">
          <CaseLabsPanel
            caseId={data.id}
            canEdit={canEdit}
            labResults={data.labResults}
            availableAttachments={data.media.map((m) => ({
              id: m.id,
              originalFilename: m.originalFilename,
            }))}
          />
        </Tabs.Content>

        {/* Tab 6: Follow-up Timeline */}
        <Tabs.Content value="followup">
          <CaseFollowupsPanel
            caseId={data.id}
            canEdit={canEdit}
            followups={data.followups}
            currentNextFollowupDate={data.nextFollowupDate}
          />
        </Tabs.Content>

        {/* Tab 7: Learning Points */}
        <Tabs.Content value="learning">
          <Card>
            <CardHeader>
              <CardTitle>Learning Points</CardTitle>
              <CardDescription>
                Technical takeaways, surgical pearls, and educational notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.learningPoints ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {data.learningPoints}
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No learning points recorded for this case yet.
                </p>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        {/* Tab 8: Activity History */}
        <Tabs.Content value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                Operational audit trail for this surgical case (non-PHI).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.auditLogs.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {AUDIT_ACTION_LABELS[log.action]}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ms-2">
                          by {log.user?.name ?? "System"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDate(log.createdAt, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>
      </Tabs.Root>

      {/* Export PDF Modal */}
      <ExportPdfModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        caseId={data.id}
        caseNumber={data.caseNumber}
        media={data.media}
      />

      {/* Share Case Modal */}
      {isOwner && (
        <ShareCaseModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          caseId={data.id}
          caseNumber={data.caseNumber}
          activeShares={data.shares}
          pendingShares={data.pendingShares}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${data.caseNumber}?`}
        description="This permanently removes this surgical case, its implants, follow-ups, laboratory results, attachments, and active colleague shares. This action cannot be undone."
        confirmLabel="Delete Case"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
