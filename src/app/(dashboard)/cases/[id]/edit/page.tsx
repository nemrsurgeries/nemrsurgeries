import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { authorizeCaseAccess } from "@/modules/authorization/policy";
import {
  getCaseDetails,
  parsePostoperativePlan,
} from "@/modules/cases/service";
import { CaseWizard } from "@/components/cases/case-wizard";
import { Button } from "@/components/ui/button";

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;

  const authz = await authorizeCaseAccess(user.id, id, "CASE_EDIT");
  if (!authz.allowed) {
    if (authz.statusCode === 404) {
      notFound();
    }
    redirect(`/cases/${id}`);
  }

  const surgicalCase = await getCaseDetails(id);
  if (!surgicalCase) {
    notFound();
  }

  const postop = parsePostoperativePlan(surgicalCase.postoperativePlan);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-1">
          <Link href={`/cases/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to {surgicalCase.caseNumber}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit {surgicalCase.caseNumber}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {surgicalCase.diagnosis || "Untitled surgical case"}
        </p>
      </div>

      <CaseWizard
        mode="edit"
        caseId={surgicalCase.id}
        caseNumber={surgicalCase.caseNumber}
        canArchive={authz.role === "OWNER"}
        initialData={{
          operationDate: toDateInputValue(surgicalCase.operationDate),
          patientAge:
            surgicalCase.patientAge !== null
              ? String(surgicalCase.patientAge)
              : "",
          patientSex: surgicalCase.patientSex,
          diagnosis: surgicalCase.diagnosis ?? "",
          procedure: surgicalCase.procedure ?? "",
          fractureClassification: surgicalCase.fractureClassification ?? "",
          classificationSystem: surgicalCase.classificationSystem ?? "",
          surgeon: surgicalCase.surgeon ?? "",
          myRole: surgicalCase.myRole ?? "",
          seniorSurgeon: surgicalCase.seniorSurgeon ?? "",
          hospital: surgicalCase.hospital ?? "",
          implants: surgicalCase.implants.map((imp) => ({
            id: imp.id,
            implantType: imp.implantType,
            manufacturer: imp.manufacturer ?? "",
            model: imp.model ?? "",
            specifications: imp.specifications ?? "",
            notes: imp.notes ?? "",
          })),
          intraoperativeNotes: surgicalCase.intraoperativeNotes ?? "",
          postoperativePlan: postop,
          learningPoints: surgicalCase.learningPoints ?? "",
          status: surgicalCase.status,
          nextFollowupDate: toDateInputValue(surgicalCase.nextFollowupDate),
        }}
      />
    </div>
  );
}
