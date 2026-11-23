"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import type { MediaCategory } from "@prisma/client";
import type { EffectiveCaseRole } from "@/modules/authorization/policy";
import { MEDIA_CATEGORY_LABELS } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface CaseMediaItem {
  id: string;
  category: MediaCategory;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  exifStripped: boolean;
  uploadedBy: string | null;
  createdAt: Date;
  uploader?: { id: string; name: string } | null;
}

interface CaseMediaPanelProps {
  caseId: string;
  currentUserId: string;
  role: Exclude<EffectiveCaseRole, "NONE">;
  media: CaseMediaItem[];
}

const CATEGORIES: MediaCategory[] = [
  "PREOPERATIVE_XRAY",
  "POSTOPERATIVE_XRAY",
  "INTRAOPERATIVE_PHOTO",
  "CLINICAL_PHOTO",
  "LABORATORY_REPORT",
  "MEDICAL_DOCUMENT",
  "OTHER",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CaseMediaPanel({
  caseId,
  currentUserId,
  role,
  media,
}: CaseMediaPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = role === "OWNER" || role === "EDITOR";

  const [category, setCategory] = useState<MediaCategory>("PREOPERATIVE_XRAY");
  const [description, setDescription] = useState("");
  const [deidentifiedConfirmed, setDeidentifiedConfirmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Cache of short-lived signed URLs for thumbnails / viewer
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightboxMediaId, setLightboxMediaId] = useState<string | null>(null);
  const [pdfPreviewMedia, setPdfPreviewMedia] = useState<{
    item: CaseMediaItem;
    url: string;
  } | null>(null);

  // Lightbox zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CaseMediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const imageItems = useMemo(
    () => media.filter((m) => m.mimeType.startsWith("image/")),
    [media],
  );

  const grouped = useMemo(() => {
    const map = new Map<MediaCategory, CaseMediaItem[]>();
    for (const item of media) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return CATEGORIES.filter((cat) => (map.get(cat)?.length ?? 0) > 0).map(
      (cat) => ({
        category: cat,
        items: map.get(cat)!,
      }),
    );
  }, [media]);

  async function fetchSignedUrl(
    mediaId: string,
    download = false,
  ): Promise<string | null> {
    if (!download && signedUrls[mediaId]) {
      return signedUrls[mediaId]!;
    }
    try {
      const res = await fetch(
        `/api/media/${mediaId}/url${download ? "?download=1" : ""}`,
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Unable to access attachment.");
        return null;
      }
      const data = (await res.json()) as { url: string };
      if (!download) {
        setSignedUrls((prev) => ({ ...prev, [mediaId]: data.url }));
      }
      return data.url;
    } catch {
      toast.error("Network error while loading attachment.");
      return null;
    }
  }

  // Prefetch short-lived signed URLs for visible image thumbnails
  useEffect(() => {
    let active = true;
    const missing = imageItems.filter((img) => !signedUrls[img.id]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (img) => {
        const res = await fetch(`/api/media/${img.id}/url`);
        if (!res.ok) return null;
        const data = (await res.json()) as { url: string };
        return [img.id, data.url] as const;
      }),
    ).then((pairs) => {
      if (!active) return;
      const updates: Record<string, string> = {};
      for (const p of pairs) {
        if (p) updates[p[0]] = p[1];
      }
      if (Object.keys(updates).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...updates }));
      }
    });

    return () => {
      active = false;
    };
  }, [imageItems, signedUrls]);

  function uploadSingleFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", caseId);
      formData.append("category", category);
      if (description.trim()) {
        formData.append("description", description.trim());
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/media/upload");
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const parsed = JSON.parse(xhr.responseText) as { error?: string };
            reject(new Error(parsed.error ?? "Upload failed."));
          } catch {
            reject(new Error("Upload failed."));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.send(formData);
    });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    if (!deidentifiedConfirmed) {
      toast.error(
        "Please confirm that the files have been de-identified before uploading.",
      );
      return;
    }

    const files = Array.from(fileList);
    setUploading(true);
    setProgress(0);
    let uploadedCount = 0;

    try {
      for (const file of files) {
        await uploadSingleFile(file);
        uploadedCount += 1;
      }
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(
        uploadedCount === 1
          ? "Attachment uploaded securely (EXIF stripped)"
          : `${uploadedCount} attachments uploaded securely`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleOpenItem(item: CaseMediaItem) {
    const url = await fetchSignedUrl(item.id, false);
    if (!url) return;

    if (item.mimeType.startsWith("image/")) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setLightboxMediaId(item.id);
    } else if (item.mimeType === "application/pdf") {
      setPdfPreviewMedia({ item, url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleDownload(item: CaseMediaItem) {
    const url = await fetchSignedUrl(item.id, true);
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = item.originalFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/media/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Unable to delete attachment.");
        return;
      }
      toast.success("Attachment deleted");
      if (lightboxMediaId === deleteTarget.id) setLightboxMediaId(null);
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const lightboxIndex = lightboxMediaId
    ? imageItems.findIndex((i) => i.id === lightboxMediaId)
    : -1;
  const activeLightboxItem =
    lightboxIndex >= 0 ? imageItems[lightboxIndex] : null;

  function canDeleteItem(item: CaseMediaItem): boolean {
    if (role === "OWNER") return true;
    if (role === "EDITOR") return item.uploadedBy === currentUserId;
    return false;
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      {canUpload && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Upload Medical Media &amp; Documents</CardTitle>
            <CardDescription>
              Files are stored privately, validated by file signature, stripped
              of EXIF metadata, and served exclusively via short-lived signed
              URLs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="media-category">Category</Label>
                <NativeSelect
                  id="media-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MediaCategory)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {MEDIA_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="media-description">
                  Description / Caption (optional)
                </Label>
                <Input
                  id="media-description"
                  placeholder="e.g. AP & lateral knee X-ray post-reduction"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={deidentifiedConfirmed}
                onChange={(e) => setDeidentifiedConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                I confirm these medical images/documents have been checked for
                visible patient identifiers (names, hospital IDs, labels).
              </span>
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragging
                  ? "border-blue-600 bg-blue-50/60"
                  : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
              }`}
            >
              <UploadCloud className="h-7 w-7 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-800">
                Drag and drop X-rays, clinical photos, or PDF reports
              </p>
              <p className="text-xs text-slate-500 mt-1">
                JPEG, PNG, WebP, or PDF &middot; Multiple files supported
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading ({progress}%)...
                  </>
                ) : (
                  "Select Files"
                )}
              </Button>

              {uploading && (
                <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-blue-700 transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categorized Gallery */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No medical attachments uploaded for this case yet.
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <Card key={group.category}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {MEDIA_CATEGORY_LABELS[group.category]}
                </CardTitle>
                <Badge variant="secondary">{group.items.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const isImage = item.mimeType.startsWith("image/");
                  const thumbUrl = signedUrls[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenItem(item)}
                        className="relative flex h-44 w-full items-center justify-center bg-slate-950/95 overflow-hidden cursor-pointer group"
                      >
                        {isImage && thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl}
                            alt={item.description || item.originalFilename}
                            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : isImage ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-slate-300">
                            <FileText className="h-9 w-9 text-blue-400" />
                            <span className="text-xs font-medium">
                              PDF Document
                            </span>
                          </div>
                        )}
                      </button>

                      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                        <div>
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {item.originalFilename}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            <span>{formatBytes(item.fileSize)}</span>
                            <span>&middot;</span>
                            <span>{formatDate(item.createdAt)}</span>
                            {item.exifStripped && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                <ShieldCheck className="h-3 w-3" />
                                EXIF stripped
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleOpenItem(item)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleDownload(item)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                          {canDeleteItem(item) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Full-Screen Zoom & Pan Image Lightbox */}
      {activeLightboxItem && signedUrls[activeLightboxItem.id] && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-white"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {activeLightboxItem.originalFilename}
              </p>
              <p className="text-xs text-slate-400">
                {MEDIA_CATEGORY_LABELS[activeLightboxItem.category]}
                {activeLightboxItem.description
                  ? ` — ${activeLightboxItem.description}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-200 hover:bg-slate-800 hover:text-white"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-200 hover:bg-slate-800 hover:text-white"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-200 hover:bg-slate-800 hover:text-white"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                title="Reset view"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-200 hover:bg-slate-800 hover:text-white"
                onClick={() => handleDownload(activeLightboxItem)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-200 hover:bg-slate-800 hover:text-white"
                onClick={() => setLightboxMediaId(null)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden select-none"
            onMouseDown={(e) => {
              setIsPanning(true);
              panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            }}
            onMouseMove={(e) => {
              if (!isPanning) return;
              setPan({
                x: e.clientX - panStartRef.current.x,
                y: e.clientY - panStartRef.current.y,
              });
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrls[activeLightboxItem.id]}
              alt={activeLightboxItem.originalFilename}
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: isPanning ? "grabbing" : "grab",
              }}
              className="max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-75"
            />

            {imageItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const prev =
                      (lightboxIndex - 1 + imageItems.length) %
                      imageItems.length;
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    setLightboxMediaId(imageItems[prev]!.id);
                  }}
                  className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-800 cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = (lightboxIndex + 1) % imageItems.length;
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    setLightboxMediaId(imageItems[next]!.id);
                  }}
                  className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-800 cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfPreviewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {pdfPreviewMedia.item.originalFilename}
                </p>
                <p className="text-xs text-slate-500">
                  {MEDIA_CATEGORY_LABELS[pdfPreviewMedia.item.category]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(pdfPreviewMedia.item)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPdfPreviewMedia(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <iframe
              src={pdfPreviewMedia.url}
              title={pdfPreviewMedia.item.originalFilename}
              className="flex-1 w-full border-0"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete medical attachment?"
        description={`Permanently remove "${deleteTarget?.originalFilename ?? ""}" from private storage and this case. This cannot be undone.`}
        confirmLabel="Delete File"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
