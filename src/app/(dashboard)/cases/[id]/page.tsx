import { notFound } from "next/navigation";
import { requireSession } from "@/modules/auth/session";
import { evaluateCasePermission } from "@/modules/authorization/policy";
import {
  getCaseDetails,
  parsePostoperativePlan,
} from "@/modules/cases/service";
import { getStorageProvider } from "@/lib/storage";
import { CaseDetailClient } from "@/components/cases/case-detail-client";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ user }, { id }] = await Promise.all([requireSession(), params]);

  const surgicalCase = await getCaseDetails(id);
  if (!surgicalCase) {
    notFound();
  }

  const activeSharePermission =
    surgicalCase.shares.find((s) => s.sharedWithUserId === user.id)
      ?.permission ?? null;

  const authz = evaluateCasePermission({
    userId: user.id,
    caseOwnerId: surgicalCase.ownerId,
    activeSharePermission,
    action: "CASE_VIEW",
  });
  if (!authz.allowed || authz.role === "NONE") {
    notFound();
  }

  // Pre-sign image URLs server-side (local HMAC signing, zero extra DB queries)
  const initialSignedUrls: Record<string, string> = {};
  const imageMedia = surgicalCase.media.filter((m) =>
    m.mimeType.startsWith("image/"),
  );
  if (imageMedia.length > 0) {
    try {
      const storage = getStorageProvider();
      const ttlSeconds =
        Number(process.env.SIGNED_URL_TTL_SECONDS ?? "300") || 300;
      const entries = await Promise.all(
        imageMedia.map(async (m) => {
          try {
            const url = await storage.getSignedReadUrl({
              key: m.storageKey,
              expiresInSeconds: ttlSeconds,
              contentType: m.mimeType,
            });
            return [m.id, url] as const;
          } catch {
            return null;
          }
        }),
      );
      for (const entry of entries) {
        if (entry) initialSignedUrls[entry[0]] = entry[1];
      }
    } catch {
      // Fall back to client-side signed URL fetching if storage is unavailable
    }
  }

  return (
    <CaseDetailClient
      role={authz.role}
      currentUserId={user.id}
      initialSignedUrls={initialSignedUrls}
      data={{
        ...surgicalCase,
        postoperativePlan: parsePostoperativePlan(
          surgicalCase.postoperativePlan,
        ),
      }}
    />
  );
}
