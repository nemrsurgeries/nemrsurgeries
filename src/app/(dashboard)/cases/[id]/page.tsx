import { notFound } from "next/navigation";
import { requireSession } from "@/modules/auth/session";
import { authorizeCaseAccess } from "@/modules/authorization/policy";
import {
  getCaseDetails,
  parsePostoperativePlan,
} from "@/modules/cases/service";
import { CaseDetailClient } from "@/components/cases/case-detail-client";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;

  const authz = await authorizeCaseAccess(user.id, id, "CASE_VIEW");
  if (!authz.allowed || authz.role === "NONE") {
    notFound();
  }

  const surgicalCase = await getCaseDetails(id);
  if (!surgicalCase) {
    notFound();
  }

  return (
    <CaseDetailClient
      role={authz.role}
      currentUserId={user.id}
      data={{
        ...surgicalCase,
        postoperativePlan: parsePostoperativePlan(
          surgicalCase.postoperativePlan,
        ),
      }}
    />
  );
}
