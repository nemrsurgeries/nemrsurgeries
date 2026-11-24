import Link from "next/link";
import { FileText, Image as ImageIcon, ShieldCheck } from "lucide-react";
import type { MediaCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { LocalizedDate, MediaCategoryText, T } from "@/components/i18n/t";
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
  const [{ user }, { category }] = await Promise.all([
    requireSession(),
    searchParams,
  ]);
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <T k="pages.mediaTitle" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <T k="pages.mediaDesc" />
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/media"
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeCategory
              ? "border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
          }`}
        >
          <T k="pages.allCategories" />
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
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
              }`}
            >
              <MediaCategoryText category={typed} />
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            <T k="pages.mediaTitle" /> ({items.length})
          </CardTitle>
          <CardDescription>
            <T k="pages.mediaDesc" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              <T k="pages.noMedia" />
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => {
                const isImage = item.mimeType.startsWith("image/");
                return (
                  <Link
                    key={item.id}
                    href={`/cases/${item.surgicalCase.id}`}
                    className="flex flex-col gap-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 -mx-2 px-2 rounded sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {isImage ? (
                          <ImageIcon className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.originalFilename}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                            {item.surgicalCase.caseNumber}
                          </span>{" "}
                          &middot;{" "}
                          {item.surgicalCase.diagnosis || (
                            <T k="dashboard.untitledDiagnosis" />
                          )}{" "}
                          &middot; <LocalizedDate value={item.createdAt} />
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
                        <MediaCategoryText category={item.category} />
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
