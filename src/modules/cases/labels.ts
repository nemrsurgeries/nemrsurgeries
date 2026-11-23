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
