"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, FileDown, X } from "lucide-react";
import type { MediaCategory } from "@prisma/client";
import { MEDIA_CATEGORY_LABELS } from "@/modules/cases/labels";
import { Button } from "@/components/ui/button";

interface ExportableMedia {
  id: string;
  category: MediaCategory;
  originalFilename: string;
  description: string | null;
  mimeType: string;
}

interface ExportPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  media: ExportableMedia[];
}

export function ExportPdfModal({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  media,
}: ExportPdfModalProps) {
  const embeddableImages = media.filter(
    (m) => m.mimeType === "image/jpeg" || m.mimeType === "image/png",
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    embeddableImages.map((m) => m.id),
  );

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleDownload() {
    const qs =
      selectedIds.length > 0
        ? `?mediaIds=${encodeURIComponent(selectedIds.join(","))}`
        : "";
    const link = document.createElement("a");
    link.href = `/api/cases/${caseId}/pdf${qs}`;
    link.download = `${caseNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-dialog-overlay fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-[1px]" />
        <Dialog.Content className="animate-dialog-content fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <FileDown className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                Export {caseNumber} as PDF
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Generates a formatted, de-identified medical case report
                including diagnosis, implants, intraoperative notes,
                postoperative plan, labs, follow-up history, and learning
                points.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Select medical images to include ({selectedIds.length} of{" "}
              {embeddableImages.length})
            </p>
            {embeddableImages.length === 0 ? (
              <p className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-500 dark:text-slate-400">
                No JPEG/PNG images attached to this case. The PDF report will
                include all structured clinical documentation.
              </p>
            ) : (
              <div className="max-h-56 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
                {embeddableImages.map((img) => {
                  const checked = selectedIds.includes(img.id);
                  return (
                    <label
                      key={img.id}
                      className="flex items-start gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId(img.id)}
                        className="mt-0.5 rounded border-slate-300 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {img.originalFilename}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {MEDIA_CATEGORY_LABELS[img.category]}
                          {img.description ? ` — ${img.description}` : ""}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download PDF Report
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
