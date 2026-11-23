"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Edit3,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createLabResultAction,
  deleteLabResultAction,
  updateLabResultAction,
} from "@/modules/labs/actions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface LabResultRow {
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
}

interface CaseLabsPanelProps {
  caseId: string;
  canEdit: boolean;
  labResults: LabResultRow[];
  availableAttachments: { id: string; originalFilename: string }[];
}

export function CaseLabsPanel({
  caseId,
  canEdit,
  labResults,
  availableAttachments,
}: CaseLabsPanelProps) {
  const router = useRouter();
  const [sortAsc, setSortAsc] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [testName, setTestName] = useState("");
  const [result, setResult] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [testDate, setTestDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [attachmentId, setAttachmentId] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => {
    return [...labResults].sort((a, b) => {
      const diff =
        new Date(a.testDate).getTime() - new Date(b.testDate).getTime();
      return sortAsc ? diff : -diff;
    });
  }, [labResults, sortAsc]);

  function resetForm() {
    setEditingId(null);
    setTestName("");
    setResult("");
    setUnit("");
    setReferenceRange("");
    setTestDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setAttachmentId("");
    setShowForm(false);
  }

  function startEdit(row: LabResultRow) {
    setEditingId(row.id);
    setTestName(row.testName);
    setResult(row.result);
    setUnit(row.unit ?? "");
    setReferenceRange(row.referenceRange ?? "");
    setTestDate(new Date(row.testDate).toISOString().slice(0, 10));
    setNotes(row.notes ?? "");
    setAttachmentId(row.attachmentId ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        caseId,
        testName,
        result,
        unit,
        referenceRange,
        testDate,
        notes,
        attachmentId,
      };
      const res = editingId
        ? await updateLabResultAction(editingId, payload)
        : await createLabResultAction(payload);

      if (!res.success) {
        toast.error(res.error ?? "Unable to save laboratory result.");
        return;
      }

      toast.success(
        editingId ? "Laboratory result updated" : "Laboratory result added",
      );
      resetForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await deleteLabResultAction(caseId, deleteId);
      if (!res.success) {
        toast.error(res.error ?? "Unable to delete laboratory result.");
        return;
      }
      toast.success("Laboratory result deleted");
      setDeleteId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function openAttachment(mediaId: string) {
    const res = await fetch(`/api/media/${mediaId}/url`);
    if (!res.ok) {
      toast.error("Unable to open laboratory report.");
      return;
    }
    const data = (await res.json()) as { url: string };
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Laboratory Results</CardTitle>
          <CardDescription>
            Track preoperative and postoperative blood work, inflammatory
            markers, and attached lab reports.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSortAsc((s) => !s)}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Date ({sortAsc ? "Oldest" : "Newest"})
          </Button>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (showForm && !editingId) {
                  resetForm();
                } else {
                  resetForm();
                  setShowForm(true);
                }
              }}
            >
              <Plus className="h-4 w-4" />
              Add Result
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {showForm && canEdit && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-slate-800">
              {editingId ? "Edit Laboratory Result" : "New Laboratory Result"}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="lab-name" className="text-xs">
                  Test name *
                </Label>
                <Input
                  id="lab-name"
                  required
                  placeholder="e.g. CRP, ESR, Hemoglobin"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-result" className="text-xs">
                  Result *
                </Label>
                <Input
                  id="lab-result"
                  required
                  placeholder="e.g. 12.4"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-unit" className="text-xs">
                  Unit
                </Label>
                <Input
                  id="lab-unit"
                  placeholder="e.g. mg/L, g/dL"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-ref" className="text-xs">
                  Reference range
                </Label>
                <Input
                  id="lab-ref"
                  placeholder="e.g. < 5.0 mg/L"
                  value={referenceRange}
                  onChange={(e) => setReferenceRange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-date" className="text-xs">
                  Test date *
                </Label>
                <Input
                  id="lab-date"
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-attachment" className="text-xs">
                  Attached report
                </Label>
                <NativeSelect
                  id="lab-attachment"
                  value={attachmentId}
                  onChange={(e) => setAttachmentId(e.target.value)}
                >
                  <option value="">None</option>
                  {availableAttachments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.originalFilename}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="lab-notes" className="text-xs">
                  Notes
                </Label>
                <Input
                  id="lab-notes"
                  placeholder="Optional clinical remarks"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingId ? "Update Result" : "Save Result"}
              </Button>
            </div>
          </form>
        )}

        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No laboratory results recorded for this case yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="py-2 pe-4 text-start">Test</th>
                  <th className="py-2 pe-4 text-start">Result</th>
                  <th className="py-2 pe-4 text-start">Reference Range</th>
                  <th className="py-2 pe-4 text-start">Test Date</th>
                  <th className="py-2 pe-4 text-start">Report</th>
                  {canEdit && <th className="py-2 text-end">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((lab) => (
                  <tr key={lab.id}>
                    <td className="py-2.5 pe-4">
                      <p className="font-medium text-slate-900">
                        {lab.testName}
                      </p>
                      {lab.notes && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {lab.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pe-4 font-medium tabular-nums text-slate-900">
                      {lab.result} {lab.unit ?? ""}
                    </td>
                    <td className="py-2.5 pe-4 text-slate-600">
                      {lab.referenceRange || "—"}
                    </td>
                    <td className="py-2.5 pe-4 whitespace-nowrap text-slate-600">
                      {formatDate(lab.testDate)}
                    </td>
                    <td className="py-2.5 pe-4">
                      {lab.attachment ? (
                        <button
                          type="button"
                          onClick={() => openAttachment(lab.attachment!.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View PDF
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-2.5 text-end whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          aria-label={`Edit ${lab.testName} result`}
                          title="Edit result"
                          onClick={() => startEdit(lab)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-600 hover:text-red-700"
                          aria-label={`Delete ${lab.testName} result`}
                          title="Delete result"
                          onClick={() => setDeleteId(lab.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete laboratory result?"
        description="This removes the selected laboratory record from the case."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
