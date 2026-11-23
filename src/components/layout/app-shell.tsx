"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MailPlus,
  Menu,
  Plus,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/modules/auth/auth-client";
import type { AuthenticatedUser } from "@/modules/auth/session";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "My Cases", icon: FolderKanban },
  { href: "/shared", label: "Shared with Me", icon: Users },
  { href: "/shared-by-me", label: "Shared by Me", icon: Share2 },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/media", label: "Medical Media", icon: ImageIcon },
];

const ACCOUNT_NAV: NavItem[] = [
  { href: "/invitations", label: "Invitations", icon: MailPlus },
  { href: "/activity", label: "Activity Log", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/security", label: "Security", icon: Shield },
];

export function AppShell({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Unable to sign out");
    } finally {
      setSigningOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/settings") return pathname === "/settings";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
        <Link
          href="/dashboard"
          aria-label={collapsed ? "OrthoCase Dashboard" : undefined}
          title={collapsed ? "OrthoCase Dashboard" : undefined}
          className="flex items-center gap-2.5 overflow-hidden"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-900 leading-none">
                OrthoCase
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Surgical Library
              </p>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        <Button asChild className={cn("w-full", collapsed && "px-0")}>
          <Link
            href="/cases/new"
            onClick={() => setMobileOpen(false)}
            aria-label={collapsed ? "New Surgical Case" : undefined}
            title={collapsed ? "New Surgical Case" : undefined}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>New Surgical Case</span>}
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-2">
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Clinical Library
            </p>
          )}
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-blue-700" : "text-slate-500",
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="space-y-0.5 border-t border-slate-200 pt-4">
          {!collapsed && (
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Account &amp; Collaboration
            </p>
          )}
          {ACCOUNT_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-blue-700" : "text-slate-500",
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div
          className={cn(
            "flex items-center gap-2.5",
            collapsed && "justify-center",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
            {getInitials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label={collapsed ? "Sign out" : undefined}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "mt-2 w-full justify-start text-slate-600 hover:text-red-700",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>{signingOut ? "Signing out..." : "Sign out"}</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:start-0 border-e border-slate-200 bg-white transition-all duration-200 z-30",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 start-0 w-64 bg-white border-e border-slate-200 shadow-lg z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div
        className={cn(
          "flex flex-1 flex-col min-w-0 transition-all duration-200",
          collapsed ? "lg:ps-16" : "lg:ps-64",
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs text-slate-500">
                {user.hospital ?? "Personal Surgical Case Library"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!user.emailVerified && (
              <span className="hidden sm:inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                Email unverified
              </span>
            )}
            <Link
              href="/profile"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              {user.name}
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
