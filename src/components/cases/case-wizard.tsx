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
import {
  getCaseStatusLabel,
  getImplantTypeLabel,
  getPatientSexLabel,
  getSurgicalRoleLabel,
} from "@/modules/cases/labels";
import { useLocale } from "@/components/i18n/locale-provider";
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

const LOCAL_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
  const { locale, dict } = useLocale();
  const isAr = locale === "ar";
  const steps = [
    { id: 1, title: dict.wizard.step1Title, subtitle: dict.wizard.step1Sub },
    { id: 2, title: dict.wizard.step2Title, subtitle: dict.wizard.step2Sub },
    { id: 3, title: dict.wizard.step3Title, subtitle: dict.wizard.step3Sub },
    { id: 4, title: dict.wizard.step4Title, subtitle: dict.wizard.step4Sub },
    { id: 5, title: dict.wizard.step5Title, subtitle: dict.wizard.step5Sub },
  ];
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
            savedAt?: string;
          };
          const savedAt = parsed.savedAt ? Date.parse(parsed.savedAt) : NaN;
          const isFresh = Number.isFinite(savedAt) &&
            Date.now() - savedAt <= LOCAL_DRAFT_MAX_AGE_MS;
          if (parsed.form && isFresh) {
            setForm({ ...baseForm, ...parsed.form });
            if (parsed.step && parsed.step >= 1 && parsed.step <= 5) {
              setStep(parsed.step);
            }
            setRestoredDraft(true);
          } else {
            window.localStorage.removeItem(storageKey);
          }
        }
      } catch {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // Browser storage may be disabled; continue without restoring a draft.
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Autosave to localStorage on form/step changes
  useEffect(() => {
    let expiryTimer: number | undefined;
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
        expiryTimer = window.setTimeout(() => {
          try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) return;
            const savedAt = Date.parse(
              (JSON.parse(raw) as { savedAt?: string }).savedAt ?? "",
            );
            if (
              !Number.isFinite(savedAt) ||
              Date.now() - savedAt >= LOCAL_DRAFT_MAX_AGE_MS
            ) {
              window.localStorage.removeItem(storageKey);
            }
          } catch {
            // Ignore storage failures; stale drafts are also checked on restore.
          }
        }, LOCAL_DRAFT_MAX_AGE_MS);
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
      if (expiryTimer !== undefined) window.clearTimeout(expiryTimer);
    };
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
          {steps.map((s) => {
            const active = s.id === step;
            const completed = s.id < step;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`w-full rounded-lg border p-3 text-start transition-colors cursor-pointer ${
                    active
                      ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40"
                      : completed
                        ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700"
                        : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        active
                          ? "bg-blue-700 text-white"
                          : completed
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {completed ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={`text-xs font-semibold truncate ${
                        active ? "text-blue-900 dark:text-blue-200" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {s.subtitle}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Autosave & Draft Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {restoredDraft && (
            <span className="rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 px-2 py-0.5 text-amber-800 dark:text-amber-200">
              {dict.wizard.draftRestored}
            </span>
          )}
          {lastAutosaved && (
            <span>
              {isAr
                ? `تم الحفظ التلقائي محلياً الساعة ${lastAutosaved}`
                : `Autosaved locally at ${lastAutosaved}`}
            </span>
          )}
        </div>
        <span className="basis-full sm:basis-auto">
          {isAr
            ? "المسودة محفوظة على هذا المتصفح فقط، وتُحذف عند تسجيل الخروج أو بعد 24 ساعة."
            : "Drafts stay in this browser and are cleared on sign-out or after 24 hours."}
        </span>
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
              {dict.wizard.discardDraft}
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
            {mode === "edit"
              ? dict.common.save
              : isAr
                ? "حفظ والمتابعة لاحقاً"
                : "Save & Continue Later"}
          </Button>
        </div>
      </div>

      {/* STEP 1 — General Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isAr ? "الخطوة 1 — البيانات العامة" : "Step 1 — General Information"}
            </CardTitle>
            <CardDescription>{dict.wizard.step1Sub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-2.5 rounded-md border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 p-3 text-xs text-blue-900 dark:text-blue-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400 mt-0.5" />
              <p>
                <strong>{dict.wizard.deidPolicyTitle}</strong>{" "}
                {dict.wizard.deidPolicyBody}
                {isAr
                  ? " لا تضع بيانات تعريفية في الملاحظات أو الصور أو الملفات المرفقة أيضاً."
                  : " Check free-text notes, image labels, and uploaded files for identifiers too."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="caseNumber">{dict.wizard.caseId}</Label>
                <Input
                  id="caseNumber"
                  name="caseNumber"
                  value={caseNumber ?? dict.wizard.autoGeneratedPlaceholder}
                  disabled
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="operationDate">{dict.wizard.operationDate}</Label>
                <Input
                  id="operationDate"
                  type="date"
                  value={form.operationDate ?? ""}
                  onChange={(e) => updateField("operationDate", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patientAge">{dict.wizard.patientAge}</Label>
                <Input
                  id="patientAge"
                  type="number"
                  min={0}
                  max={120}
                  placeholder={isAr ? "مثال: 42" : "e.g. 42"}
                  value={form.patientAge ?? ""}
                  onChange={(e) => updateField("patientAge", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patientSex">{dict.wizard.patientSex}</Label>
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
                  <option value="UNSPECIFIED">
                    {getPatientSexLabel("UNSPECIFIED", locale)}
                  </option>
                  <option value="MALE">{getPatientSexLabel("MALE", locale)}</option>
                  <option value="FEMALE">
                    {getPatientSexLabel("FEMALE", locale)}
                  </option>
                  <option value="OTHER">
                    {getPatientSexLabel("OTHER", locale)}
                  </option>
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
            <CardTitle>
              {isAr
                ? "الخطوة 2 — التشخيص والإجراء الجراحي"
                : "Step 2 — Diagnosis & Procedure"}
            </CardTitle>
            <CardDescription>{dict.wizard.step2Sub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="diagnosis">{dict.wizard.diagnosis}</Label>
              <Input
                id="diagnosis"
                placeholder="e.g. Closed right distal femur intra-articular fracture"
                value={form.diagnosis ?? ""}
                onChange={(e) => updateField("diagnosis", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="procedure">{dict.wizard.procedure}</Label>
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
                  {dict.wizard.classificationSystem}
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
                  <option value="">
                    {isAr ? "اختر نظام التصنيف" : "Select classification system"}
                  </option>
                  {CLASSIFICATION_SYSTEM_PRESETS.map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                  <option value="Custom">
                    {isAr ? "تصنيف مخصص..." : "Custom classification..."}
                  </option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fractureClassification">
                  {dict.wizard.fractureClassification}
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
                <Label htmlFor="customSystem">
                  {isAr ? "اسم نظام التصنيف المخصص" : "Custom system name"}
                </Label>
                <Input
                  id="customSystem"
                  placeholder={
                    isAr
                      ? "أدخل اسم نظام التصنيف"
                      : "Enter custom classification system"
                  }
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
              <CardTitle>
                {isAr ? "الخطوة 3 — الفريق الجراحي" : "Step 3 — Surgical Team"}
              </CardTitle>
              <CardDescription>{dict.wizard.step3Sub}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="surgeon">{dict.wizard.responsibleSurgeon}</Label>
                <Input
                  id="surgeon"
                  placeholder="Dr. ..."
                  value={form.surgeon ?? ""}
                  onChange={(e) => updateField("surgeon", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="myRole">{dict.wizard.mySurgicalRole}</Label>
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
                  <option value="">
                    {isAr ? "اختر الدور الجراحي" : "Select role"}
                  </option>
                  <option value="OPERATOR">
                    {getSurgicalRoleLabel("OPERATOR", locale)}
                  </option>
                  <option value="FIRST_ASSISTANT">
                    {getSurgicalRoleLabel("FIRST_ASSISTANT", locale)}
                  </option>
                  <option value="ASSISTANT">
                    {getSurgicalRoleLabel("ASSISTANT", locale)}
                  </option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seniorSurgeon">{dict.wizard.seniorSurgeon}</Label>
                <Input
                  id="seniorSurgeon"
                  placeholder={
                    isAr
                      ? "الاستشاري المشرف (اختياري)"
                      : "Optional supervising consultant"
                  }
                  value={form.seniorSurgeon ?? ""}
                  onChange={(e) => updateField("seniorSurgeon", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hospital">{dict.wizard.hospital}</Label>
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
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 space-y-0">
              <div>
                <CardTitle>{dict.wizard.implantsTitle}</CardTitle>
                <CardDescription>
                  {isAr
                    ? "أضف الشرائح أو المسامير أو المسامير النخاعية المستخدمة في العملية."
                    : "Add plates, screws, intramedullary nails, or fixation systems used in this procedure."}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImplant}
              >
                <Plus className="h-4 w-4" />
                {dict.wizard.addImplant}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(form.implants ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-md">
                  {dict.wizard.noImplants}
                </p>
              ) : (
                (form.implants ?? []).map((imp, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Implant #{idx + 1} —{" "}
                        {getImplantTypeLabel(imp.implantType, locale)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImplant(idx)}
                        className="h-7 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {dict.common.delete}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isAr ? "النوع" : "Type"}
                        </Label>
                        <NativeSelect
                          value={imp.implantType}
                          onChange={(e) =>
                            updateImplant(idx, {
                              implantType: e.target
                                .value as ImplantInput["implantType"],
                            })
                          }
                        >
                          <option value="PLATE">
                            {getImplantTypeLabel("PLATE", locale)}
                          </option>
                          <option value="SCREW">
                            {getImplantTypeLabel("SCREW", locale)}
                          </option>
                          <option value="NAIL">
                            {getImplantTypeLabel("NAIL", locale)}
                          </option>
                          <option value="OTHER">
                            {getImplantTypeLabel("OTHER", locale)}
                          </option>
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isAr ? "الشركة المصنّعة" : "Manufacturer"}
                        </Label>
                        <Input
                          placeholder="e.g. DePuy Synthes"
                          value={imp.manufacturer ?? ""}
                          onChange={(e) =>
                            updateImplant(idx, { manufacturer: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isAr ? "الموديل" : "Model"}
                        </Label>
                        <Input
                          placeholder="e.g. VA-LCP Distal Femur"
                          value={imp.model ?? ""}
                          onChange={(e) =>
                            updateImplant(idx, { model: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isAr ? "المواصفات" : "Specifications"}
                        </Label>
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
                      <Label className="text-xs">
                        {isAr ? "ملاحظات" : "Notes"}
                      </Label>
                      <Input
                        placeholder={
                          isAr
                            ? "ملاحظات إضافية حول التثبيت (اختياري)"
                            : "Optional fixation remarks"
                        }
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
              <CardTitle>
                {isAr
                  ? `الخطوة 4 — ${dict.wizard.intraopNotes}`
                  : "Step 4 — Intraoperative Notes"}
              </CardTitle>
              <CardDescription>
                {isAr
                  ? "وثّق المدخل الجراحي وخطوات العملية والملاحظات وأي مضاعفات."
                  : "Document surgical approach, operative steps, observations, and complications."}
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
              <CardTitle>{dict.wizard.postopPlan}</CardTitle>
              <CardDescription>
                {isAr
                  ? "سجّل تعليمات ما بعد العملية وموعد المتابعة القادم."
                  : "Record your documented postoperative instructions and next scheduled follow-up."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="weightBearing">
                    {dict.wizard.weightBearing}
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
                    {dict.wizard.nextFollowupDate}
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
                  <Label htmlFor="rehabilitationPlan">
                    {dict.wizard.rehabPlan}
                  </Label>
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
                  <Label htmlFor="medicationNotes">
                    {dict.wizard.medications}
                  </Label>
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
                    {dict.wizard.followupInstructions}
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
                  <Label htmlFor="postopAdditional">
                    {dict.wizard.additionalNotes}
                  </Label>
                  <Textarea
                    id="postopAdditional"
                    placeholder={
                      isAr
                        ? "ملاحظات إضافية بعد العملية..."
                        : "Other postoperative remarks..."
                    }
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
              <CardTitle>{dict.wizard.learningPoints}</CardTitle>
              <CardDescription>
                {isAr
                  ? "دوّن الدروس الفنية المستفادة والملاحظات التعليمية الشخصية."
                  : "Capture technical takeaways, pitfalls avoided, and personal educational notes."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                placeholder={
                  isAr
                    ? "ملاحظات فنية رئيسية، نصائح الرد والتثبيت، أو نقاط للتحسين مستقبلاً..."
                    : "Key technical observations, reduction pearls, or areas for future improvement..."
                }
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
            <CardTitle>
              {isAr ? "الخطوة 5 — المراجعة والحفظ" : "Step 5 — Review & Save"}
            </CardTitle>
            <CardDescription>
              {isAr
                ? "راجع ملخص الحالة واختر حالتها. يمكنك إدارة صور الأشعة والتحاليل والمتابعات مباشرة من صفحة تفاصيل الحالة بعد الحفظ."
                : "Review your surgical case summary and choose its status. X-rays, photographs, lab reports, and follow-up entries can be managed directly from the Case Details page after saving."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dict.wizard.operationDate}
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {form.operationDate || (isAr ? "غير محدد" : "Not specified")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dict.detail.generalDemographics}
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {form.patientAge
                    ? `${form.patientAge} ${dict.detail.years}`
                    : dict.common.none}{" "}
                  &middot;{" "}
                  {getPatientSexLabel(form.patientSex ?? "UNSPECIFIED", locale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dict.wizard.diagnosis}
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {form.diagnosis || (isAr ? "غير محدد" : "Not specified")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dict.wizard.procedure}
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {form.procedure || (isAr ? "غير محدد" : "Not specified")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dict.wizard.fractureClassification}
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {form.fractureClassification ||
                    (isAr ? "غير محدد" : "Not specified")}
                  {form.classificationSystem
                    ? ` (${form.classificationSystem})`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dict.wizard.step3Title}
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {form.surgeon || dict.common.none} &middot;{" "}
                  {(form.implants ?? []).length} {dict.cases.implantsCount}
                </p>
              </div>
            </div>

            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="caseStatus">{dict.wizard.caseStatus}</Label>
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
                <option value="DRAFT">{getCaseStatusLabel("DRAFT", locale)}</option>
                <option value="IN_PROGRESS">
                  {getCaseStatusLabel("IN_PROGRESS", locale)}
                </option>
                <option value="AWAITING_FOLLOWUP">
                  {getCaseStatusLabel("AWAITING_FOLLOWUP", locale)}
                </option>
                <option value="COMPLETED">
                  {getCaseStatusLabel("COMPLETED", locale)}
                </option>
                {canArchive && (
                  <option value="ARCHIVED">
                    {getCaseStatusLabel("ARCHIVED", locale)}
                  </option>
                )}
              </NativeSelect>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {dict.common.previous}
        </Button>

        <div className="flex items-center gap-2">
          {step < 5 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
            >
              {dict.common.next}
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
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
              {mode === "edit" ? dict.wizard.updateCase : dict.wizard.saveCase}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
