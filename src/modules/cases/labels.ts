import type {
  AuditAction,
  CaseStatus,
  ImplantType,
  MediaCategory,
  PatientSex,
  SurgicalRole,
} from "@prisma/client";

export const CASE_STATUS_META: Record<
  CaseStatus,
  {
    label: string;
    variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
  }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  AWAITING_FOLLOWUP: { label: "Awaiting Follow-up", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export const SURGICAL_ROLE_LABELS: Record<SurgicalRole, string> = {
  OPERATOR: "Operator",
  FIRST_ASSISTANT: "First Assistant",
  ASSISTANT: "Assistant",
};

export const PATIENT_SEX_LABELS: Record<PatientSex, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNSPECIFIED: "Unspecified",
};

export const IMPLANT_TYPE_LABELS: Record<ImplantType, string> = {
  PLATE: "Plate",
  SCREW: "Screw",
  NAIL: "Intramedullary Nail",
  OTHER: "Other",
};

export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  PREOPERATIVE_XRAY: "Preoperative X-ray",
  POSTOPERATIVE_XRAY: "Postoperative X-ray",
  INTRAOPERATIVE_PHOTO: "Intraoperative Photo",
  CLINICAL_PHOTO: "Clinical Photo",
  LABORATORY_REPORT: "Laboratory Report",
  MEDICAL_DOCUMENT: "Medical Document",
  OTHER: "Other",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CASE_CREATED: "Case created",
  CASE_VIEWED: "Case viewed",
  CASE_EDITED: "Case updated",
  CASE_DELETED: "Case deleted",
  CASE_ARCHIVED: "Case archived",
  CASE_EXPORTED_PDF: "PDF report exported",
  ATTACHMENT_UPLOADED: "Attachment uploaded",
  ATTACHMENT_DELETED: "Attachment deleted",
  CASE_SHARED: "Case shared",
  PERMISSION_CHANGED: "Sharing permission changed",
  ACCESS_REVOKED: "Sharing access revoked",
  INVITATION_SENT: "Invitation sent",
  INVITATION_REVOKED: "Invitation revoked",
  INVITATION_ACCEPTED: "Invitation accepted",
};

const CASE_STATUS_AR: Record<CaseStatus, string> = {
  DRAFT: "مسودة",
  IN_PROGRESS: "قيد الإجراء",
  AWAITING_FOLLOWUP: "بانتظار المتابعة",
  COMPLETED: "مكتملة",
  ARCHIVED: "مؤرشفة",
};

const SURGICAL_ROLE_AR: Record<SurgicalRole, string> = {
  OPERATOR: "Operator (جراح رئيسي)",
  FIRST_ASSISTANT: "First Assistant (مساعد أول)",
  ASSISTANT: "Assistant (مساعد)",
};

const PATIENT_SEX_AR: Record<PatientSex, string> = {
  MALE: "ذكر",
  FEMALE: "أنثى",
  OTHER: "آخر",
  UNSPECIFIED: "غير محدد",
};

const IMPLANT_TYPE_AR: Record<ImplantType, string> = {
  PLATE: "Plate (شريحة)",
  SCREW: "Screw (مسمار)",
  NAIL: "Intramedullary Nail (مسمار نخاعي)",
  OTHER: "أخرى",
};

const MEDIA_CATEGORY_AR: Record<MediaCategory, string> = {
  PREOPERATIVE_XRAY: "أشعة ما قبل العملية (Pre-op X-ray)",
  POSTOPERATIVE_XRAY: "أشعة ما بعد العملية (Post-op X-ray)",
  INTRAOPERATIVE_PHOTO: "صورة أثناء العملية",
  CLINICAL_PHOTO: "صورة إكلينيكية",
  LABORATORY_REPORT: "تقرير تحاليل",
  MEDICAL_DOCUMENT: "مستند طبي",
  OTHER: "أخرى",
};

const AUDIT_ACTION_AR: Record<AuditAction, string> = {
  CASE_CREATED: "تم إنشاء حالة",
  CASE_VIEWED: "تم عرض حالة",
  CASE_EDITED: "تم تحديث حالة",
  CASE_DELETED: "تم حذف حالة",
  CASE_ARCHIVED: "تمت أرشفة حالة",
  CASE_EXPORTED_PDF: "تم تصدير تقرير PDF",
  ATTACHMENT_UPLOADED: "تم رفع مرفق",
  ATTACHMENT_DELETED: "تم حذف مرفق",
  CASE_SHARED: "تمت مشاركة حالة",
  PERMISSION_CHANGED: "تم تغيير صلاحية المشاركة",
  ACCESS_REVOKED: "تم إلغاء صلاحية الوصول",
  INVITATION_SENT: "تم إرسال دعوة",
  INVITATION_REVOKED: "تم إلغاء دعوة",
  INVITATION_ACCEPTED: "تم قبول دعوة",
};

export function getCaseStatusLabel(
  status: CaseStatus,
  locale: "en" | "ar" = "en",
): string {
  return locale === "ar"
    ? CASE_STATUS_AR[status]
    : CASE_STATUS_META[status].label;
}

export function getSurgicalRoleLabel(
  role: SurgicalRole,
  locale: "en" | "ar" = "en",
): string {
  return locale === "ar" ? SURGICAL_ROLE_AR[role] : SURGICAL_ROLE_LABELS[role];
}

export function getPatientSexLabel(
  sex: PatientSex,
  locale: "en" | "ar" = "en",
): string {
  return locale === "ar" ? PATIENT_SEX_AR[sex] : PATIENT_SEX_LABELS[sex];
}

export function getImplantTypeLabel(
  type: ImplantType,
  locale: "en" | "ar" = "en",
): string {
  return locale === "ar" ? IMPLANT_TYPE_AR[type] : IMPLANT_TYPE_LABELS[type];
}

export function getMediaCategoryLabel(
  category: MediaCategory,
  locale: "en" | "ar" = "en",
): string {
  return locale === "ar"
    ? MEDIA_CATEGORY_AR[category]
    : MEDIA_CATEGORY_LABELS[category];
}

export function getAuditActionLabel(
  action: AuditAction,
  locale: "en" | "ar" = "en",
): string {
  return locale === "ar" ? AUDIT_ACTION_AR[action] : AUDIT_ACTION_LABELS[action];
}
