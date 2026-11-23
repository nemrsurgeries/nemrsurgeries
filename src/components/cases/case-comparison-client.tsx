"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import type { CaseStatus, ImplantType, SurgicalRole } from "@prisma/client";
import {
  CASE_STATUS_META,
  IMPLANT_TYPE_LABELS,
  SURGICAL_ROLE_LABELS,
} from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SelectableCase {
  id: string;
  caseNumber: string;
  diagnosis: string | null;
  procedure: string | null;
  source: "Owned" | "Shared";
}

interface ComparedCase {
  id: string;
  caseNumber: string;
  operationDate: Date | null;
  diagnosis: string | null;
  procedure: string | null;
  fractureClassification: string | null;
  classificationSystem: string | null;
  surgeon: string | null;
  myRole: SurgicalRole | null;
  hospital: string | null;
  status: CaseStatus;
  learningPoints: string | null;
  owner: { name: string };
  implants: {
    id: string;
    implantType: ImplantType;
    manufacturer: string | null;
    model: string | null;
    specifications: string | null;
  }[];
  followups: {
    id: string;
    followupDate: Date;
    clinicalOutcome: string | null;
    radiologicalOutcome: string | null;
    complications: string | null;
  }[];
}

export function CaseComparisonClient({
  selectable,
  selectedIds,
  compared,
}: {
  selectable: SelectableCase[];
  selectedIds: string[];
  compared: ComparedCase[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(selectedIds);

  function togglePick(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  function applyComparison() {
    if (picked.length === 0) {
      router.push("/cases/compare");
      return;
    }
    router.push(`/cases/compare?ids=${encodeURIComponent(picked.join(","))}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Select up to 4 authorized cases ({picked.length}/4 selected)
          </CardTitle>
          <CardDescription className="text-xs">
            Only cases you own or that are actively shared with you can be
            compared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectable.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              No cases available to compare yet.
            </p>
          ) : (
            <>
              <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {selectable.map((c) => {
                  const active = picked.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start gap-2 rounded-md border p-2.5 text-xs cursor-pointer transition-colors ${
                        active
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={!active && picked.length >= 4}
                        onChange={() => togglePick(c.id)}
                        className="mt-0.5 rounded border-slate-300 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                            {c.caseNumber}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.source}
                          </Badge>
                        </div>
                        <p className="truncate font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                          {c.diagnosis || "Untitled"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={picked.length < 2}
                  onClick={applyComparison}
                >
                  <GitCompareArrows className="h-4 w-4" />
                  Compare Selected Cases
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {compared.length >= 2 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                  <th className="sticky start-0 z-10 w-36 sm:w-40 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Field
                  </th>
                  {compared.map((c) => (
                    <th key={c.id} className="min-w-[220px] px-4 py-3 text-start">
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        {c.caseNumber}
                      </Link>
                      <div className="mt-1">
                        <Badge variant={CASE_STATUS_META[c.status].variant}>
                          {CASE_STATUS_META[c.status].label}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 align-top">
                <tr>
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Diagnosis
                  </td>
                  {compared.map((c) => (
                    <td key={c.id} className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {c.diagnosis || "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Classification
                  </td>
                  {compared.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {c.fractureClassification || "—"}
                      {c.classificationSystem
                        ? ` (${c.classificationSystem})`
                        : ""}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Procedure
                  </td>
                  {compared.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {c.procedure || "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Operation Date &amp; Role
                  </td>
                  {compared.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      <div>{formatDate(c.operationDate)}</div>
                      <div>
                        {c.myRole ? SURGICAL_ROLE_LABELS[c.myRole] : "—"} &middot;{" "}
                        {c.hospital || "—"}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Implants
                  </td>
                  {compared.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                      {c.implants.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="list-disc ps-4 space-y-1">
                          {c.implants.map((imp) => (
                            <li key={imp.id}>
                              {IMPLANT_TYPE_LABELS[imp.implantType]}{" "}
                              {[imp.manufacturer, imp.model, imp.specifications]
                                .filter(Boolean)
                                .join(" · ")}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Latest Follow-up
                  </td>
                  {compared.map((c) => {
                    const latest = c.followups[0];
                    return (
                      <td key={c.id} className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        {latest ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatDate(latest.followupDate)}
                            </p>
                            {latest.clinicalOutcome && (
                              <p>{latest.clinicalOutcome}</p>
                            )}
                            {latest.radiologicalOutcome && (
                              <p className="text-slate-500 dark:text-slate-400">
                                XR: {latest.radiologicalOutcome}
                              </p>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-[1px_0_0_0_var(--border)]">
                    Learning Points
                  </td>
                  {compared.map((c) => (
                    <td
                      key={c.id}
                      className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
                    >
                      {c.learningPoints || "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
