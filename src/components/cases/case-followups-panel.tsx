"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Edit3, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createFollowupAction,
  deleteFollowupAction,
  updateFollowupAction,
} from "@/modules/followups/actions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface FollowupRow {
  id: string;
  followupDate: Date;
  clinicalOutcome: string | null;
  radiologicalOutcome: string | null;
  complications: string | null;
  notes: string | null;
  author: { id: string; name: string } | null;
}

interface CaseFollowupsPanelProps {
  caseId: string;
  canEdit: boolean;
  followups: FollowupRow[];
  currentNextFollowupDate: Date | null;
}

export function CaseFollowupsPanel({
  caseId,
  canEdit,
  followups,
  currentNextFollowupDate,
}: CaseFollowupsPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [followupDate, setFollowupDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [clinicalOutcome, setClinicalOutcome] = useState("");
  const [radiologicalOutcome, setRadiologicalOutcome] = useState("");
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowupDate, setNextFollowupDate] = useState(
    currentNextFollowupDate
      ? new Date(currentNextFollowupDate).toISOString().slice(0, 10)
      : "",
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function resetForm() {
    setEditingId(null);
    setFollowupDate(new Date().toISOString().slice(0, 10));
    setClinicalOutcome("");
    setRadiologicalOutcome("");
    setComplications("");
    setNotes("");
    setShowForm(false);
  }

  function startEdit(entry: FollowupRow) {
    setEditingId(entry.id);
    setFollowupDate(new Date(entry.followupDate).toISOString().slice(0, 10));
    setClinicalOutcome(entry.clinicalOutcome ?? "");
    setRadiologicalOutcome(entry.radiologicalOutcome ?? "");
    setComplications(entry.complications ?? "");
    setNotes(entry.notes ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        caseId,
        followupDate,
        clinicalOutcome,
        radiologicalOutcome,
        complications,
        notes,
        nextFollowupDate: editingId ? undefined : nextFollowupDate || null,
      };
      const res = editingId
        ? await updateFollowupAction(editingId, payload)
        : await createFollowupAction(payload);

      if (!res.success) {
        toast.error(res.error ?? "Unable to save follow-up entry.");
        return;
      }

      toast.success(
        editingId ? "Follow-up entry updated" : "Follow-up entry added",
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
      const res = await deleteFollowupAction(caseId, deleteId);
      if (!res.success) {
        toast.error(res.error ?? "Unable to delete follow-up entry.");
        return;
      }
      toast.success("Follow-up entry deleted");
      setDeleteId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Follow-up Timeline</CardTitle>
          <CardDescription>
            Historical follow-up visits are preserved chronologically and never
            overwritten.
          </CardDescription>
        </div>
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
            Add Follow-up
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {showForm && canEdit && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-slate-800">
              {editingId ? "Edit Follow-up Entry" : "New Follow-up Visit"}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fu-date" className="text-xs">
                  Follow-up date *
                </Label>
                <Input
                  id="fu-date"
                  type="date"
                  required
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                />
              </div>
              {!editingId && (
                <div className="space-y-1">
                  <Label htmlFor="fu-next" className="text-xs">
                    Update next scheduled follow-up (optional)
                  </Label>
                  <Input
                    id="fu-next"
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="fu-clinical" className="text-xs">
                  Clinical outcome
                </Label>
                <Textarea
                  id="fu-clinical"
                  rows={3}
                  placeholder="ROM, pain score, wound healing, weight-bearing tolerance..."
                  value={clinicalOutcome}
                  onChange={(e) => setClinicalOutcome(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fu-radiological" className="text-xs">
                  Radiological outcome
                </Label>
                <Textarea
                  id="fu-radiological"
                  rows={3}
                  placeholder="Callus formation, alignment, implant position..."
                  value={radiologicalOutcome}
                  onChange={(e) => setRadiologicalOutcome(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fu-complications" className="text-xs">
                  Complications
                </Label>
                <Textarea
                  id="fu-complications"
                  rows={2}
                  placeholder="Any infection, stiffness, hardware irritation, or none..."
                  value={complications}
                  onChange={(e) => setComplications(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fu-notes" className="text-xs">
                  Additional notes
                </Label>
                <Textarea
                  id="fu-notes"
                  rows={2}
                  placeholder="Rehab adjustments or next steps..."
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
                {editingId ? "Update Entry" : "Save Follow-up"}
              </Button>
            </div>
          </form>
        )}

        {followups.length === 0 ? (
          <div className="py-8 text-center">
            <CalendarClock className="mx-auto h-7 w-7 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              No follow-up visits documented yet.
            </p>
          </div>
        ) : (
          <ol className="relative border-s border-slate-200 ms-2 space-y-5">
            {followups.map((f) => (
              <li key={f.id} className="ms-5">
                <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />
                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">
                        {formatDate(f.followupDate)}
                      </span>
                      {f.author && (
                        <span className="text-slate-400">
                          &middot; Recorded by {f.author.name}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => startEdit(f)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteId(f.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {f.clinicalOutcome && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">
                        Clinical outcome:{" "}
                      </span>
                      <span className="text-slate-600 whitespace-pre-wrap">
                        {f.clinicalOutcome}
                      </span>
                    </div>
                  )}
                  {f.radiologicalOutcome && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">
                        Radiological outcome:{" "}
                      </span>
                      <span className="text-slate-600 whitespace-pre-wrap">
                        {f.radiologicalOutcome}
                      </span>
                    </div>
                  )}
                  {f.complications && (
                    <div className="text-sm text-red-700">
                      <span className="font-medium">Complications: </span>
                      <span className="whitespace-pre-wrap">
                        {f.complications}
                      </span>
                    </div>
                  )}
                  {f.notes && (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {f.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete follow-up entry?"
        description="This permanently removes this follow-up visit from the case timeline."
        confirmLabel="Delete Entry"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
