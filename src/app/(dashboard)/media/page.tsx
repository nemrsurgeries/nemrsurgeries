import Link from "next/link";
import { FileText, Image as ImageIcon, ShieldCheck } from "lucide-react";
import type { MediaCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { MEDIA_CATEGORY_LABELS } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const VALID_CATEGORIES = new Set<string>([
  "PREOPERATIVE_XRAY",
  "POSTOPERATIVE_XRAY",
  "INTRAOPERATIVE_PHOTO",
  "CLINICAL_PHOTO",
  "LABORATORY_REPORT",
  "MEDICAL_DOCUMENT",
  "OTHER",
]);

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { user } = await requireSession();
  const { category } = await searchParams;
  const activeCategory =
    category && VALID_CATEGORIES.has(category)
      ? (category as MediaCategory)
      : undefined;

  const items = await db.caseMedia.findMany({
    where: {
      surgicalCase: { ownerId: user.id },
      category: activeCategory,
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      surgicalCase: {
        select: { id: true, caseNumber: true, diagnosis: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Medical Media Library
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Private imaging and medical documents across your owned surgical
          cases.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/media"
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeCategory
              ? "border-blue-600 bg-blue-50 text-blue-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Categories
        </Link>
        {Array.from(VALID_CATEGORIES).map((cat) => {
          const typed = cat as MediaCategory;
          const active = activeCategory === typed;
          return (
            <Link
              key={cat}
              href={`/media?category=${cat}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {MEDIA_CATEGORY_LABELS[typed]}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Attachments ({items.length})</CardTitle>
          <CardDescription>
            Select any item to open its parent surgical case and view via a
            short-lived signed URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No medical media found in this view. Open a surgical case to
              upload X-rays, photographs, or PDF reports.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const isImage = item.mimeType.startsWith("image/");
                return (
                  <Link
                    key={item.id}
                    href={`/cases/${item.surgicalCase.id}`}
                    className="flex flex-col gap-2 py-3 hover:bg-slate-50 -mx-2 px-2 rounded sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        {isImage ? (
                          <ImageIcon className="h-4 w-4 text-blue-700" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-700" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.originalFilename}
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-blue-700">
                            {item.surgicalCase.caseNumber}
                          </span>{" "}
                          &middot; {item.surgicalCase.diagnosis || "Untitled"}{" "}
                          &middot; {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.exifStripped && (
                        <Badge variant="success">
                          <ShieldCheck className="h-3 w-3 me-1" />
                          EXIF stripped
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {MEDIA_CATEGORY_LABELS[item.category]}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
