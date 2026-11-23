"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  CLASSIFICATION_SYSTEM_PRESETS,
  type CaseFormInput,
  type ImplantInput,
} from "@/modules/cases/schemas";
import { createCaseAction, updateCaseAction } from "@/modules/cases/actions";
import { IMPLANT_TYPE_LABELS } from "@/modules/cases/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STEPS = [
  { id: 1, title: "General Info", subtitle: "Date & anonymized demographics" },
  { id: 2, title: "Diagnosis", subtitle: "Procedure & classification" },
  { id: 3, title: "Team & Implants", subtitle: "Surgeons & hardware" },
  { id: 4, title: "Documentation", subtitle: "Op notes, plan & learning" },
  { id: 5, title: "Review & Save", subtitle: "Status & completion" },
] as const;

const EMPTY_FORM: CaseFormInput = {
  operationDate: "",
  patientAge: "",
  patientSex: "UNSPECIFIED",
  diagnosis: "",
  procedure: "",
  fractureClassification: "",
  classificationSystem: "",
  surgeon: "",
  myRole: "",
  seniorSurgeon: "",
  hospital: "",
  implants: [],
  intraoperativeNotes: "",
  postoperativePlan: {
    weightBearing: "",
    rehabilitationPlan: "",
    medicationNotes: "",
    followupInstructions: "",
    additionalNotes: "",
  },
  learningPoints: "",
  status: "DRAFT",
  nextFollowupDate: "",
};

interface CaseWizardProps {
  mode: "create" | "edit";
  caseId?: string;
  caseNumber?: string;
  defaultHospital?: string | null;
  defaultSurgeon?: string | null;
  initialData?: CaseFormInput;
  canArchive?: boolean;
}

export function CaseWizard({
  mode,
  caseId,
  caseNumber,
  defaultHospital,
  defaultSurgeon,
  initialData,
  canArchive = true,
}: CaseWizardProps) {
  const router = useRouter();
  const storageKey =
    mode === "edit" && caseId
      ? `orthocase:wizard:edit:${caseId}`
      : "orthocase:wizard:new";

  const baseForm: CaseFormInput = initialData ?? {
    ...EMPTY_FORM,
    hospital: defaultHospital ?? "",
    surgeon: defaultSurgeon ?? "",
  };

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CaseFormInput>(baseForm);
  const [customSystem, setCustomSystem] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Restore local draft on mount (refresh resilience)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            form?: CaseFormInput;
            step?: number;
          };
          if (parsed.form) {
            setForm({ ...baseForm, ...parsed.form });
            if (parsed.step && parsed.step >= 1 && parsed.step <= 5) {
              setStep(parsed.step);
            }
            setRestoredDraft(true);
          }
        }
      } catch {
        // ignore storage errors
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Autosave to localStorage on form/step changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ form, step, savedAt: new Date().toISOString() }),
        );
        setLastAutosaved(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form, step, storageKey]);

  function updateField<K extends keyof CaseFormInput>(
    key: K,
    value: CaseFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePostop(
    key: keyof NonNullable<CaseFormInput["postoperativePlan"]>,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      postoperativePlan: {
        weightBearing: prev.postoperativePlan?.weightBearing ?? "",
        rehabilitationPlan: prev.postoperativePlan?.rehabilitationPlan ?? "",
        medicationNotes: prev.postoperativePlan?.medicationNotes ?? "",
        followupInstructions: prev.postoperativePlan?.followupInstructions ?? "",
        additionalNotes: prev.postoperativePlan?.additionalNotes ?? "",
        [key]: value,
      },
    }));
  }

  function addImplant() {
    const next: ImplantInput = {
      implantType: "PLATE",
      manufacturer: "",
      model: "",
      specifications: "",
      notes: "",
    };
    setForm((prev) => ({
      ...prev,
      implants: [...(prev.implants ?? []), next],
    }));
  }

  function updateImplant(index: number, patch: Partial<ImplantInput>) {
    setForm((prev) => {
      const list = [...(prev.implants ?? [])];
      const current = list[index];
      if (!current) return prev;
      list[index] = { ...current, ...patch };
      return { ...prev, implants: list };
    });
  }

  function removeImplant(index: number) {
    setForm((prev) => ({
      ...prev,
      implants: (prev.implants ?? []).filter((_, i) => i !== index),
    }));
  }

  function discardLocalDraft() {
    window.localStorage.removeItem(storageKey);
    setForm(baseForm);
    setStep(1);
    setRestoredDraft(false);
    toast.success("Local draft cleared");
  }

  async function handlePersist(overrideStatus?: CaseFormInput["status"]) {
    setSaving(true);
    try {
      const payload: CaseFormInput = {
        ...form,
        classificationSystem:
          form.classificationSystem === "Custom"
            ? customSystem.trim() || "Custom"
            : form.classificationSystem,
        status: overrideStatus ?? form.status,
      };

      if (mode === "edit" && caseId) {
        const res = await updateCaseAction(caseId, payload);
        if (!res.success) {
          toast.error(res.error ?? "Unable to save changes.");
          return;
        }
        window.localStorage.removeItem(storageKey);
        toast.success("Surgical case updated");
        router.push(`/cases/${caseId}`);
        router.refresh();
      } else {
        const res = await createCaseAction(payload);
        if (!res.success || !res.data) {
          toast.error(res.error ?? "Unable to create surgical case.");
          return;
        }
        window.localStorage.removeItem(storageKey);
        toast.success(
          payload.status === "DRAFT"
            ? `Draft ${res.data.caseNumber} saved`
            : `Case ${res.data.caseNumber} created`,
        );
        router.push(`/cases/${res.data.id}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const isPresetSystem =
    !form.classificationSystem ||
    (CLASSIFICATION_SYSTEM_PRESETS as readonly string[]).includes(
      form.classificationSystem,
    );

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <nav aria-label="Case creation steps">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STEPS.map((s) => {
            const active = s.id === step;
            const completed = s.id < step;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`w-full rounded-lg border p-3 text-start transition-colors cursor-pointer ${
                    active
                      ? "border-blue-600 bg-blue-50/70"
                      : completed
                        ? "border-slate-200 bg-white hover:border-blue-300"
                        : "border-slate-200 bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        active
                          ? "bg-blue-700 text-white"
                          : completed
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {completed ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={`text-xs font-semibold truncate ${
                        active ? "text-blue-900" : "text-slate-800"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 truncate">
                    {s.subtitle}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Autosave & Draft Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          {restoredDraft && (
            <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800">
              Restored unsaved local draft
            </span>
          )}
          {lastAutosaved && (
            <span>Autosaved locally at {lastAutosaved}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {restoredDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardLocalDraft}
              className="h-7 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset draft
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() =>
              handlePersist(mode === "edit" ? undefined : "DRAFT")
            }
            className="h-7 text-xs"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {mode === "edit" ? "Save Changes" : "Save & Continue Later"}
          </Button>
        </div>
      </div>

      {/* STEP 1 — General Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — General Information</CardTitle>
            <CardDescription>
              Basic case timing and anonymized patient demographics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-2.5 rounded-md border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
              <ShieldAlert className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
              <p>
                <strong>De-identification policy:</strong> Do not enter patient
                names, national IDs, phone numbers, or other personally
                identifying information. A unique Case ID is generated
                automatically for your library.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Case ID</Label>
                <Input
                  value={
                    caseNumber ??
                    "Auto-generated on save (e.g. ORTHO-2026-0001)"
                  }
                  disabled
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="operationDate">Operation date</Label>
                <Input
                  id="operationDate"
                  type="date"
                  value={form.operationDate ?? ""}
                  onChange={(e) => updateField("operationDate", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patientAge">Patient age (years)</Label>
                <Input
                  id="patientAge"
                  type="number"
                  min={0}
                  max={120}
                  placeholder="e.g. 42"
                  value={form.patientAge ?? ""}
                  onChange={(e) => updateField("patientAge", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patientSex">Patient sex</Label>
                <NativeSelect
                  id="patientSex"
                  value={form.patientSex ?? "UNSPECIFIED"}
                  onChange={(e) =>
                    updateField(
                      "patientSex",
                      e.target.value as CaseFormInput["patientSex"],
                    )
                  }
                >
                  <option value="UNSPECIFIED">Unspecified</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </NativeSelect>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — Diagnosis & Procedure */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Diagnosis &amp; Procedure</CardTitle>
            <CardDescription>
              Document the orthopedic diagnosis, surgical procedure, and
              fracture classification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input
                id="diagnosis"
                placeholder="e.g. Closed right distal femur intra-articular fracture"
                value={form.diagnosis ?? ""}
                onChange={(e) => updateField("diagnosis", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="procedure">Procedure</Label>
              <Input
                id="procedure"
                placeholder="e.g. ORIF with lateral distal femoral locking plate"
                value={form.procedure ?? ""}
                onChange={(e) => updateField("procedure", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="classificationSystem">
                  Classification system
                </Label>
                <NativeSelect
                  id="classificationSystem"
                  value={
                    isPresetSystem
                      ? (form.classificationSystem ?? "")
                      : "Custom"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Custom") {
                      updateField("classificationSystem", "Custom");
                    } else {
                      updateField("classificationSystem", val);
                    }
                  }}
                >
                  <option value="">Select classification system</option>
                  {CLASSIFICATION_SYSTEM_PRESETS.map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                  <option value="Custom">Custom classification...</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fractureClassification">
                  Fracture classification
                </Label>
                <Input
                  id="fractureClassification"
                  placeholder="e.g. AO/OTA 33-C2 or Lauge-Hansen SER IV"
                  value={form.fractureClassification ?? ""}
                  onChange={(e) =>
                    updateField("fractureClassification", e.target.value)
                  }
                />
              </div>
            </div>

            {(!isPresetSystem || form.classificationSystem === "Custom") && (
              <div className="space-y-1.5">
                <Label htmlFor="customSystem">Custom system name</Label>
                <Input
                  id="customSystem"
                  placeholder="Enter custom classification system"
                  value={
                    customSystem ||
                    (form.classificationSystem === "Custom"
                      ? ""
                      : (form.classificationSystem ?? ""))
                  }
                  onChange={(e) => setCustomSystem(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3 — Surgical Team & Implants */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 3 — Surgical Team</CardTitle>
              <CardDescription>
                Record your surgical role, responsible surgeon, senior
                supervisor, and hospital.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="surgeon">Responsible surgeon</Label>
                <Input
                  id="surgeon"
                  placeholder="Dr. ..."
                  value={form.surgeon ?? ""}
                  onChange={(e) => updateField("surgeon", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="myRole">My role</Label>
                <NativeSelect
                  id="myRole"
                  value={form.myRole ?? ""}
                  onChange={(e) =>
                    updateField(
                      "myRole",
                      e.target.value as CaseFormInput["myRole"],
                    )
                  }
                >
                  <option value="">Select role</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="FIRST_ASSISTANT">First Assistant</option>
                  <option value="ASSISTANT">Assistant</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seniorSurgeon">Senior surgeon</Label>
                <Input
                  id="seniorSurgeon"
                  placeholder="Optional supervising consultant"
                  value={form.seniorSurgeon ?? ""}
                  onChange={(e) => updateField("seniorSurgeon", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hospital">Hospital / Institution</Label>
                <Input
                  id="hospital"
                  placeholder="e.g. Cairo Orthopedic Teaching Hospital"
                  value={form.hospital ?? ""}
                  onChange={(e) => updateField("hospital", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Instruments &amp; Implants</CardTitle>
                <CardDescription>
                  Add plates, screws, intramedullary nails, or fixation systems
                  used in this procedure.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImplant}
              >
                <Plus className="h-4 w-4" />
                Add Implant
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(form.implants ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-md">
                  No implants recorded yet. Click &ldquo;Add Implant&rdquo; to
                  document hardware.
                </p>
              ) : (
                (form.implants ?? []).map((imp, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Implant #{idx + 1} — {IMPLANT_TYPE_LABELS[imp.implantType]}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImplant(idx)}
                        className="h-7 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <NativeSelect
                          value={imp.implantType}
                          onChange={(e) =>
                            updateImplant(idx, {
                              implantType: e.target
                                .value as ImplantInput["implantType"],
                            })
                          }
                        >
                          <option value="PLATE">Plate</option>
                          <option value="SCREW">Screw</option>
                          <option value="NAIL">Intramedullary Nail</option>
                          <option value="OTHER">Other</option>
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Manufacturer</Label>
                        <Input
                          placeholder="e.g. DePuy Synthes"
                          value={imp.manufacturer ?? ""}
                          onChange={(e) =>
                            updateImplant(idx, { manufacturer: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Input
                          placeholder="e.g. VA-LCP Distal Femur"
                          value={imp.model ?? ""}
                          onChange={(e) =>
                            updateImplant(idx, { model: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Specifications</Label>
                        <Input
                          placeholder="e.g. 9-hole, 4.5mm titanium"
                          value={imp.specifications ?? ""}
                          onChange={(e) =>
                            updateImplant(idx, {
                              specifications: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        placeholder="Optional fixation remarks"
                        value={imp.notes ?? ""}
                        onChange={(e) =>
                          updateImplant(idx, { notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 4 — Surgical Documentation */}
      {step === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 4 — Intraoperative Notes</CardTitle>
              <CardDescription>
                Document surgical approach, operative steps, observations, and
                complications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={form.intraoperativeNotes ?? ""}
                onChange={(html) => updateField("intraoperativeNotes", html)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Postoperative Plan</CardTitle>
              <CardDescription>
                Record your documented postoperative instructions and next
                scheduled follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="weightBearing">
                    Weight-bearing instructions
                  </Label>
                  <Input
                    id="weightBearing"
                    placeholder="e.g. Non-weight-bearing for 6 weeks"
                    value={form.postoperativePlan?.weightBearing ?? ""}
                    onChange={(e) =>
                      updatePostop("weightBearing", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nextFollowupDate">
                    Next scheduled follow-up date
                  </Label>
                  <Input
                    id="nextFollowupDate"
                    type="date"
                    value={form.nextFollowupDate ?? ""}
                    onChange={(e) =>
                      updateField("nextFollowupDate", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rehabilitationPlan">Rehabilitation plan</Label>
                  <Textarea
                    id="rehabilitationPlan"
                    placeholder="ROM exercises, physiotherapy milestones..."
                    value={form.postoperativePlan?.rehabilitationPlan ?? ""}
                    onChange={(e) =>
                      updatePostop("rehabilitationPlan", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="medicationNotes">Medication notes</Label>
                  <Textarea
                    id="medicationNotes"
                    placeholder="Documented postoperative regimen notes..."
                    value={form.postoperativePlan?.medicationNotes ?? ""}
                    onChange={(e) =>
                      updatePostop("medicationNotes", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="followupInstructions">
                    Follow-up instructions
                  </Label>
                  <Textarea
                    id="followupInstructions"
                    placeholder="Suture removal, check X-rays at 2 and 6 weeks..."
                    value={form.postoperativePlan?.followupInstructions ?? ""}
                    onChange={(e) =>
                      updatePostop("followupInstructions", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="postopAdditional">Additional notes</Label>
                  <Textarea
                    id="postopAdditional"
                    placeholder="Other postoperative remarks..."
                    value={form.postoperativePlan?.additionalNotes ?? ""}
                    onChange={(e) =>
                      updatePostop("additionalNotes", e.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Points</CardTitle>
              <CardDescription>
                Capture technical takeaways, pitfalls avoided, and personal
                educational notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                placeholder="Key technical observations, reduction pearls, or areas for future improvement..."
                value={form.learningPoints ?? ""}
                onChange={(e) => updateField("learningPoints", e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 5 — Medical Documentation & Review */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Review &amp; Save</CardTitle>
            <CardDescription>
              Review your surgical case summary and choose its status. X-rays,
              photographs, lab reports, and follow-up entries can be managed
              directly from the Case Details page after saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Operation Date</p>
                <p className="font-medium text-slate-900">
                  {form.operationDate || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Patient Demographics</p>
                <p className="font-medium text-slate-900">
                  {form.patientAge ? `${form.patientAge} yrs` : "Age —"} &middot;{" "}
                  {form.patientSex}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Diagnosis</p>
                <p className="font-medium text-slate-900">
                  {form.diagnosis || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Procedure</p>
                <p className="font-medium text-slate-900">
                  {form.procedure || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Classification</p>
                <p className="font-medium text-slate-900">
                  {form.fractureClassification || "Not specified"}
                  {form.classificationSystem
                    ? ` (${form.classificationSystem})`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">
                  Surgical Team &amp; Hardware
                </p>
                <p className="font-medium text-slate-900">
                  {form.surgeon || "Surgeon —"} &middot;{" "}
                  {(form.implants ?? []).length} implant(s)
                </p>
              </div>
            </div>

            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="caseStatus">Case status</Label>
              <NativeSelect
                id="caseStatus"
                value={form.status ?? "DRAFT"}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target.value as CaseFormInput["status"],
                  )
                }
              >
                <option value="DRAFT">Draft</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_FOLLOWUP">Awaiting Follow-up</option>
                <option value="COMPLETED">Completed</option>
                {canArchive && <option value="ARCHIVED">Archived</option>}
              </NativeSelect>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {step < 5 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
            >
              Next Step
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={saving}
              onClick={() => handlePersist()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {mode === "edit" ? "Save Case Changes" : "Create Surgical Case"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
