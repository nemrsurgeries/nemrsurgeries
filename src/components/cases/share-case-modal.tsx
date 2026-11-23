"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  Loader2,
  MailPlus,
  Search,
  Share2,
  UserCheck,
  UserMinus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { SharePermission } from "@prisma/client";
import {
  grantCaseShareAction,
  revokeCaseShareAction,
  searchDoctorsAction,
  updateCaseSharePermissionAction,
} from "@/modules/sharing/actions";
import { createInvitationAction } from "@/modules/invitations/actions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface DoctorSearchResult {
  id: string;
  name: string;
  email: string;
  professionalTitle: string | null;
  hospital: string | null;
}

export interface ActiveShareItem {
  id: string;
  permission: SharePermission;
  sharedWith: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PendingShareItem {
  id: string;
  permission: SharePermission;
  invitation: {
    id: string;
    email: string;
    expiresAt: Date;
  };
}

interface ShareCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  activeShares: ActiveShareItem[];
  pendingShares: PendingShareItem[];
}

export function ShareCaseModal({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  activeShares,
  pendingShares,
}: ShareCaseModalProps) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<DoctorSearchResult[]>([]);
  const [selectedDoctor, setSelectedDoctor] =
    useState<DoctorSearchResult | null>(null);
  const [permission, setPermission] = useState<SharePermission>("VIEWER");
  const [granting, setGranting] = useState(false);

  // Invite & share if colleague is not yet registered
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] =
    useState<SharePermission>("VIEWER");
  const [inviting, setInviting] = useState(false);
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);

  const [busyShareId, setBusyShareId] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      toast.error("Enter at least 2 characters to search doctors.");
      return;
    }
    setSearching(true);
    setHasSearched(false);
    setSelectedDoctor(null);
    try {
      const res = await searchDoctorsAction(query);
      setResults(res.doctors);
      setHasSearched(true);
      if (res.doctors.length === 0) {
        if (query.includes("@")) {
          setInviteEmail(query.trim().toLowerCase());
        }
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleGrantShare() {
    if (!selectedDoctor) return;
    setGranting(true);
    try {
      const res = await grantCaseShareAction({
        caseId,
        recipientUserId: selectedDoctor.id,
        permission,
      });
      if (!res.success) {
        toast.error(res.error ?? "Unable to share case.");
        return;
      }
      toast.success(
        `Shared ${caseNumber} with ${selectedDoctor.name} (${permission})`,
      );
      setSelectedDoctor(null);
      setResults([]);
      setHasSearched(false);
      setQuery("");
      router.refresh();
    } finally {
      setGranting(false);
    }
  }

  async function handleInviteAndShare(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setDevInviteUrl(null);
    try {
      const res = await createInvitationAction({
        email: inviteEmail,
        caseId,
        permission: invitePermission,
      });
      if (!res.success) {
        toast.error(res.error ?? "Unable to send invitation.");
        return;
      }
      toast.success(
        `Invitation sent to ${inviteEmail}. Case access activates after registration.`,
      );
      setInviteEmail("");
      if (res.inviteUrl) setDevInviteUrl(res.inviteUrl);
      router.refresh();
    } finally {
      setInviting(false);
    }
  }

  async function handleChangePermission(
    shareId: string,
    nextPerm: SharePermission,
  ) {
    setBusyShareId(shareId);
    try {
      const res = await updateCaseSharePermissionAction({
        caseId,
        shareId,
        permission: nextPerm,
      });
      if (!res.success) {
        toast.error(res.error ?? "Unable to update permission.");
        return;
      }
      toast.success(`Permission updated to ${nextPerm}`);
      router.refresh();
    } finally {
      setBusyShareId(null);
    }
  }

  async function handleRevoke(shareId: string, name: string) {
    setBusyShareId(shareId);
    try {
      const res = await revokeCaseShareAction({ caseId, shareId });
      if (!res.success) {
        toast.error(res.error ?? "Unable to revoke access.");
        return;
      }
      toast.success(`Revoked access for ${name}`);
      router.refresh();
    } finally {
      setBusyShareId(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Share2 className="h-4 w-4 text-blue-700" />
                Share {caseNumber}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-slate-500">
                Grant explicit Viewer or Editor access to registered colleagues.
                You always retain full ownership and can revoke access
                immediately.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-6">
            {/* Search Registered Doctors */}
            <div className="space-y-3">
              <Label htmlFor="doctor-search" className="text-xs font-semibold">
                Share with a registered doctor
              </Label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="doctor-search"
                    placeholder="Search by doctor name or email..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (hasSearched) setHasSearched(false);
                    }}
                    className="ps-8"
                  />
                </div>
                <Button type="submit" variant="outline" disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </form>

              {hasSearched && !searching && results.length === 0 && (
                <p
                  role="status"
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                >
                  No matching registered doctors found. You can invite them by
                  email below.
                </p>
              )}

              {results.length > 0 && (
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-slate-50/50">
                  {results.map((doc) => {
                    const isSelected = selectedDoctor?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDoctor(doc)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-start text-sm transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 text-blue-900"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {doc.email}
                            {doc.hospital ? ` · ${doc.hospital}` : ""}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-blue-700" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedDoctor && (
                <div className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-blue-950 truncate">
                      {selectedDoctor.name}
                    </p>
                    <p className="text-blue-800 truncate">
                      {selectedDoctor.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <NativeSelect
                      value={permission}
                      onChange={(e) =>
                        setPermission(e.target.value as SharePermission)
                      }
                      className="h-8 w-28 text-xs"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </NativeSelect>
                    <Button
                      type="button"
                      size="sm"
                      disabled={granting}
                      onClick={handleGrantShare}
                    >
                      {granting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      Grant Access
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Recipients */}
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-800">
                Colleagues with access ({activeShares.length})
              </p>
              {activeShares.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  This case is currently private to you.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {activeShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {share.sharedWith.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {share.sharedWith.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <NativeSelect
                          value={share.permission}
                          disabled={busyShareId === share.id}
                          onChange={(e) =>
                            handleChangePermission(
                              share.id,
                              e.target.value as SharePermission,
                            )
                          }
                          className="h-8 w-28 text-xs"
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyShareId === share.id}
                          onClick={() =>
                            handleRevoke(share.id, share.sharedWith.name)
                          }
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Share Invitations */}
            {pendingShares.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold text-slate-800">
                  Pending invitations ({pendingShares.length})
                </p>
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-slate-50/60">
                  {pendingShares.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {p.invitation.email}
                        </p>
                        <p className="text-slate-500">
                          Expires {formatDate(p.invitation.expiresAt)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Pending ({p.permission})
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Unregistered Colleague */}
            <div className="space-y-2.5 border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-800">
                Colleague not on OrthoCase yet?
              </p>
              <p className="text-xs text-slate-500">
                Send an invitation with pending access to this case. Access
                activates only after they register and accept.
              </p>
              <form
                onSubmit={handleInviteAndShare}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <Input
                  type="email"
                  required
                  placeholder="colleague@hospital.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <NativeSelect
                  value={invitePermission}
                  onChange={(e) =>
                    setInvitePermission(e.target.value as SharePermission)
                  }
                  className="sm:w-28"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </NativeSelect>
                <Button type="submit" variant="outline" disabled={inviting}>
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="h-4 w-4" />
                  )}
                  Invite &amp; Share
                </Button>
              </form>

              {devInviteUrl && (
                <div className="rounded border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-900 break-all">
                  <strong>Dev invite link:</strong> {devInviteUrl}
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
