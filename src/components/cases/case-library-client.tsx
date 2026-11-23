"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  FolderOpen,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { CaseStatus, PatientSex, SurgicalRole } from "@prisma/client";
import { CASE_STATUS_META, SURGICAL_ROLE_LABELS } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent } from "@/components/ui/card";

export interface CaseLibraryItem {
  id: string;
  caseNumber: string;
  operationDate: Date | null;
  patientAge: number | null;
  patientSex: PatientSex;
  diagnosis: string | null;
  procedure: string | null;
  fractureClassification: string | null;
  classificationSystem: string | null;
  surgeon: string | null;
  myRole: SurgicalRole | null;
  hospital: string | null;
  status: CaseStatus;
  updatedAt: Date;
  _count: {
    media: number;
    followups: number;
    implants: number;
    shares: number;
  };
}

interface CaseLibraryClientProps {
  items: CaseLibraryItem[];
  total: number;
  page: number;
  totalPages: number;
  hospitals: string[];
  initialFilters: {
    q?: string;
    status?: string;
    myRole?: string;
    hospital?: string;
    surgeon?: string;
    procedure?: string;
    dateFrom?: string;
    dateTo?: string;
    sort: string;
  };
}

export function CaseLibraryClient({
  items,
  total,
  page,
  totalPages,
  hospitals,
  initialFilters,
}: CaseLibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [showFilters, setShowFilters] = useState(
    Boolean(
      initialFilters.status ||
        initialFilters.myRole ||
        initialFilters.hospital ||
        initialFilters.surgeon ||
        initialFilters.procedure ||
        initialFilters.dateFrom ||
        initialFilters.dateTo,
    ),
  );

  const [q, setQ] = useState(initialFilters.q ?? "");
  const [status, setStatus] = useState(initialFilters.status ?? "");
  const [myRole, setMyRole] = useState(initialFilters.myRole ?? "");
  const [hospital, setHospital] = useState(initialFilters.hospital ?? "");
  const [surgeon, setSurgeon] = useState(initialFilters.surgeon ?? "");
  const [procedure, setProcedure] = useState(initialFilters.procedure ?? "");
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialFilters.dateTo ?? "");
  const [sort, setSort] = useState(initialFilters.sort);

  const hasActiveFilters = Boolean(
    q || status || myRole || hospital || surgeon || procedure || dateFrom || dateTo,
  );

  function applyFilters(overrides?: Record<string, string>) {
    const next: Record<string, string> = {
      q,
      status,
      myRole,
      hospital,
      surgeon,
      procedure,
      dateFrom,
      dateTo,
      sort,
      page: "1",
      ...overrides,
    };

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v && !(k === "page" && v === "1") && !(k === "sort" && v === "updated_desc")) {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    router.push(qs ? `/cases?${qs}` : "/cases");
  }

  function clearFilters() {
    setQ("");
    setStatus("");
    setMyRole("");
    setHospital("");
    setSurgeon("");
    setProcedure("");
    setDateFrom("");
    setDateTo("");
    setSort("updated_desc");
    router.push("/cases");
  }

  function goToPage(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }
    const qs = params.toString();
    router.push(qs ? `/cases?${qs}` : "/cases");
  }

  return (
    <div className="space-y-4">
      {/* Search & Controls Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters();
            }}
            className="flex flex-col gap-3 lg:flex-row lg:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by Case ID, diagnosis, procedure, classification, surgeon, or hospital..."
                className="ps-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm">
                Search
              </Button>
              <Button
                type="button"
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters((s) => !s)}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>

              <NativeSelect
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  applyFilters({ sort: e.target.value });
                }}
                aria-label="Sort cases"
                className="h-8 w-44 text-xs"
              >
                <option value="updated_desc">Recently updated</option>
                <option value="operation_desc">Operation date (newest)</option>
                <option value="operation_asc">Operation date (oldest)</option>
                <option value="case_number_desc">Case ID (descending)</option>
              </NativeSelect>

              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
                    viewMode === "table"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  aria-label="Table view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </form>

          {showFilters && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="filter-status" className="text-xs">
                    Status
                  </Label>
                  <NativeSelect
                    id="filter-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All active statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="AWAITING_FOLLOWUP">Awaiting Follow-up</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-role" className="text-xs">
                    My Surgical Role
                  </Label>
                  <NativeSelect
                    id="filter-role"
                    value={myRole}
                    onChange={(e) => setMyRole(e.target.value)}
                  >
                    <option value="">Any role</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="FIRST_ASSISTANT">First Assistant</option>
                    <option value="ASSISTANT">Assistant</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-hospital" className="text-xs">
                    Hospital
                  </Label>
                  <Input
                    id="filter-hospital"
                    list="hospital-suggestions"
                    placeholder="Filter by hospital"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                  />
                  <datalist id="hospital-suggestions">
                    {hospitals.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-surgeon" className="text-xs">
                    Responsible Surgeon
                  </Label>
                  <Input
                    id="filter-surgeon"
                    placeholder="Filter by surgeon"
                    value={surgeon}
                    onChange={(e) => setSurgeon(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-procedure" className="text-xs">
                    Procedure
                  </Label>
                  <Input
                    id="filter-procedure"
                    placeholder="e.g. ORIF, IM Nail"
                    value={procedure}
                    onChange={(e) => setProcedure(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-from" className="text-xs">
                    Operation Date (From)
                  </Label>
                  <Input
                    id="filter-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-to" className="text-xs">
                    Operation Date (To)
                  </Label>
                  <Input
                    id="filter-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyFilters()}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-800">{items.length}</strong> of{" "}
          <strong className="text-slate-800">{total}</strong> owned surgical
          case{total === 1 ? "" : "s"}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-blue-700 hover:underline cursor-pointer"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {hasActiveFilters
                ? "No matching surgical cases"
                : "Your surgical case library is empty"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {hasActiveFilters
                ? "Try adjusting your search query or clearing active filters."
                : "Create your first structured surgical case to begin documenting procedures, implants, and follow-up outcomes."}
            </p>
            <div className="mt-4 flex items-center gap-2">
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/cases/new">
                    <Plus className="h-4 w-4" />
                    Create First Case
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-start">Case ID</th>
                  <th className="px-4 py-3 text-start">Diagnosis &amp; Procedure</th>
                  <th className="px-4 py-3 text-start">Classification</th>
                  <th className="px-4 py-3 text-start">Operation Date</th>
                  <th className="px-4 py-3 text-start">Role / Hospital</th>
                  <th className="px-4 py-3 text-start">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((c) => {
                  const statusMeta = CASE_STATUS_META[c.status];
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-medium text-slate-900 hover:text-blue-700 block"
                        >
                          {c.diagnosis || "Untitled diagnosis"}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                          {c.procedure || "No procedure recorded"}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {c.fractureClassification ? (
                          <div>
                            <span className="font-medium">
                              {c.fractureClassification}
                            </span>
                            {c.classificationSystem && (
                              <span className="block text-xs text-slate-500">
                                {c.classificationSystem}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatDate(c.operationDate)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>
                          {c.myRole ? SURGICAL_ROLE_LABELS[c.myRole] : "—"}
                        </div>
                        {c.hospital && (
                          <div className="text-slate-400 truncate max-w-[160px]">
                            {c.hospital}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusMeta.variant}>
                          {statusMeta.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const statusMeta = CASE_STATUS_META[c.status];
            return (
              <Link key={c.id} href={`/cases/${c.id}`} className="group block">
                <Card className="h-full transition-colors group-hover:border-blue-300">
                  <CardContent className="p-4 flex h-full flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700">
                          {c.caseNumber}
                        </span>
                        <Badge variant={statusMeta.variant}>
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 line-clamp-2">
                          {c.diagnosis || "Untitled diagnosis"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {c.procedure || "No procedure recorded"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Operation: {formatDate(c.operationDate)}</span>
                        {c.fractureClassification && (
                          <span className="font-medium text-slate-700">
                            {c.fractureClassification}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{c.hospital || "No hospital"}</span>
                        <span>
                          {c._count.implants} imp &middot; {c._count.followups} f/u
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
