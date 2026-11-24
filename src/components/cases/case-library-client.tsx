"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  FolderOpen,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { CaseStatus, PatientSex, SurgicalRole } from "@prisma/client";
import {
  CASE_STATUS_META,
  getCaseStatusLabel,
  getSurgicalRoleLabel,
} from "@/modules/cases/labels";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/utils";
import { useLocalStorage } from "@/lib/use-local-storage";
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

const VIEW_MODES = ["table", "cards"] as const;

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
  const { locale, dict } = useLocale();

  const [viewMode, setViewMode] = useLocalStorage<"table" | "cards">(
    "orthocase-cases-view",
    "table",
    VIEW_MODES,
  );
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedQRef = useRef(initialFilters.q ?? "");

  const hasActiveFilters = Boolean(
    q || status || myRole || hospital || surgeon || procedure || dateFrom || dateTo,
  );

  // Live debounced search (300ms) so users don't have to click a Search button
  useEffect(() => {
    if (q === lastSubmittedQRef.current) return;
    const handle = setTimeout(() => {
      lastSubmittedQRef.current = q;
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) {
        params.set("q", q.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `/cases?${qs}` : "/cases");
    }, 300);
    return () => clearTimeout(handle);
  }, [q, router, searchParams]);

  // Press "/" anywhere outside an input to focus the search box
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                ref={searchInputRef}
                id="cases-search"
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={dict.cases.searchPlaceholder}
                aria-label={dict.common.search}
                className="ps-9 pe-12"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none hidden sm:inline-flex absolute end-2.5 top-1/2 -translate-y-1/2 items-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  /
                </kbd>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters((s) => !s)}
              >
                <Filter className="h-3.5 w-3.5" />
                {dict.common.filters}
              </Button>

              <NativeSelect
                id="cases-sort"
                name="sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  applyFilters({ sort: e.target.value });
                }}
                aria-label={dict.cases.sortUpdatedDesc}
                className="h-8 w-full sm:w-44 text-xs"
              >
                <option value="updated_desc">{dict.cases.sortUpdatedDesc}</option>
                <option value="operation_desc">{dict.cases.sortOpDesc}</option>
                <option value="operation_asc">{dict.cases.sortOpAsc}</option>
                <option value="case_number_desc">{dict.cases.sortCaseDesc}</option>
              </NativeSelect>

              <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
                    viewMode === "table"
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                  aria-label={dict.cases.tableView}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                  aria-label={dict.cases.cardView}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </form>

          {showFilters && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="filter-status" className="text-xs">
                    {dict.cases.status}
                  </Label>
                  <NativeSelect
                    id="filter-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">{dict.cases.allStatuses}</option>
                    <option value="DRAFT">{getCaseStatusLabel("DRAFT", locale)}</option>
                    <option value="IN_PROGRESS">{getCaseStatusLabel("IN_PROGRESS", locale)}</option>
                    <option value="AWAITING_FOLLOWUP">
                      {getCaseStatusLabel("AWAITING_FOLLOWUP", locale)}
                    </option>
                    <option value="COMPLETED">{getCaseStatusLabel("COMPLETED", locale)}</option>
                    <option value="ARCHIVED">{getCaseStatusLabel("ARCHIVED", locale)}</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-role" className="text-xs">
                    {dict.cases.myRole}
                  </Label>
                  <NativeSelect
                    id="filter-role"
                    value={myRole}
                    onChange={(e) => setMyRole(e.target.value)}
                  >
                    <option value="">{dict.cases.allRoles}</option>
                    <option value="OPERATOR">{getSurgicalRoleLabel("OPERATOR", locale)}</option>
                    <option value="FIRST_ASSISTANT">
                      {getSurgicalRoleLabel("FIRST_ASSISTANT", locale)}
                    </option>
                    <option value="ASSISTANT">{getSurgicalRoleLabel("ASSISTANT", locale)}</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-hospital" className="text-xs">
                    {dict.cases.hospital}
                  </Label>
                  <Input
                    id="filter-hospital"
                    list="hospital-suggestions"
                    placeholder={
                      locale === "ar" ? "تصفية حسب المستشفى" : "Filter by hospital"
                    }
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
                    {dict.cases.surgeon}
                  </Label>
                  <Input
                    id="filter-surgeon"
                    placeholder={
                      locale === "ar" ? "تصفية حسب الجراح" : "Filter by surgeon"
                    }
                    value={surgeon}
                    onChange={(e) => setSurgeon(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filter-procedure" className="text-xs">
                    {dict.cases.procedure}
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
                    {dict.cases.dateFrom}
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
                    {dict.cases.dateTo}
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
                    {dict.common.clearFilters}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyFilters()}
                >
                  {dict.cases.applyFilters}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {dict.cases.showingOf}{" "}
          <strong className="text-slate-800 dark:text-slate-200">{items.length}</strong>{" "}
          {dict.cases.of}{" "}
          <strong className="text-slate-800 dark:text-slate-200">{total}</strong>{" "}
          {dict.cases.ownedCasesLabel}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {dict.common.clearFilters}
          </button>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-3">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {hasActiveFilters
                ? dict.cases.noMatchingCases
                : dict.dashboard.noCasesYet}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {dict.cases.noMatchingHint}
            </p>
            <div className="mt-4 flex items-center gap-2">
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {dict.common.clearFilters}
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/cases/new">
                    <Plus className="h-4 w-4" />
                    {dict.dashboard.createFirstCase}
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
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 text-start">{dict.cases.colCaseId}</th>
                  <th className="px-4 py-3 text-start">{dict.cases.colDiagnosisProc}</th>
                  <th className="px-4 py-3 text-start">{dict.wizard.fractureClassification}</th>
                  <th className="px-4 py-3 text-start">{dict.cases.colOpDate}</th>
                  <th className="px-4 py-3 text-start">{dict.cases.colRoleHospital}</th>
                  <th className="px-4 py-3 text-start">{dict.cases.colStatus}</th>
                  <th className="px-3 py-3 text-end w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {items.map((c) => {
                  const statusMeta = CASE_STATUS_META[c.status];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/cases/${c.id}`)}
                      className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/cases/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <Link
                          href={`/cases/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 block transition-colors"
                        >
                          {c.diagnosis || "Untitled diagnosis"}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                          {c.procedure || "No procedure recorded"}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {c.fractureClassification ? (
                          <div>
                            <span className="font-medium">
                              {c.fractureClassification}
                            </span>
                            {c.classificationSystem && (
                              <span className="block text-xs text-slate-500 dark:text-slate-400">
                                {c.classificationSystem}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatDate(c.operationDate, undefined, locale)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        <div>
                          {c.myRole
                            ? getSurgicalRoleLabel(c.myRole, locale)
                            : "—"}
                        </div>
                        {c.hospital && (
                          <div className="text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
                            {c.hospital}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusMeta.variant}>
                          {getCaseStatusLabel(c.status, locale)}
                        </Badge>
                      </td>
                      <td
                        className="px-3 py-3 whitespace-nowrap text-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Link
                            href={`/cases/${c.id}`}
                            title="View case"
                            aria-label={`View ${c.caseNumber}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/cases/${c.id}/edit`}
                            title={dict.common.edit}
                            aria-label={`Edit ${c.caseNumber}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Link>
                        </div>
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
                <Card className="h-full transition-colors group-hover:border-blue-300 dark:group-hover:border-blue-700">
                  <CardContent className="p-4 flex h-full flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {c.caseNumber}
                        </span>
                        <Badge variant={statusMeta.variant}>
                          {getCaseStatusLabel(c.status, locale)}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2">
                          {c.diagnosis || dict.dashboard.untitledDiagnosis}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {c.procedure || dict.common.none}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>
                          {formatDate(c.operationDate, undefined, locale)}
                        </span>
                        {c.fractureClassification && (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {c.fractureClassification}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                        <span>{c.hospital || dict.common.none}</span>
                        <span>
                          {c._count.implants} {dict.cases.implantsCount} &middot;{" "}
                          {c._count.followups} {dict.cases.followupsCount}
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
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
