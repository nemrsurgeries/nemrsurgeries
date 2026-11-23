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
import { useLocalStorage } from "@/lib/use-local-storage";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLocale } from "@/components/i18n/locale-provider";

interface NavItem {
  href: string;
  labelKey:
    | "dashboard"
    | "myCases"
    | "sharedWithMe"
    | "sharedByMe"
    | "followUps"
    | "medicalMedia"
    | "invitations"
    | "activityLog"
    | "profile"
    | "settings"
    | "security";
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/cases", labelKey: "myCases", icon: FolderKanban },
  { href: "/shared", labelKey: "sharedWithMe", icon: Users },
  { href: "/shared-by-me", labelKey: "sharedByMe", icon: Share2 },
  { href: "/follow-ups", labelKey: "followUps", icon: CalendarClock },
  { href: "/media", labelKey: "medicalMedia", icon: ImageIcon },
];

const ACCOUNT_NAV: NavItem[] = [
  { href: "/invitations", labelKey: "invitations", icon: MailPlus },
  { href: "/activity", labelKey: "activityLog", icon: Activity },
  { href: "/profile", labelKey: "profile", icon: User },
  { href: "/settings", labelKey: "settings", icon: Settings },
  { href: "/settings/security", labelKey: "security", icon: Shield },
];

const SIDEBAR_STORAGE_KEY = "orthocase-sidebar-collapsed";
const BOOL_VALUES = ["true", "false"] as const;

export function AppShell({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useLocale();
  const [collapsedPref, setCollapsedPref] = useLocalStorage(
    SIDEBAR_STORAGE_KEY,
    "false",
    BOOL_VALUES,
  );
  const collapsed = collapsedPref === "true";
  const setCollapsed = (updater: (prev: boolean) => boolean) =>
    setCollapsedPref((prev) => (updater(prev === "true") ? "true" : "false"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success(dict.nav.signedOut);
      router.push("/login");
      router.refresh();
    } catch {
      toast.error(dict.nav.unableToSignOut);
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
      <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3">
        <Link
          href="/dashboard"
          aria-label={collapsed ? `${dict.brand.name} ${dict.nav.dashboard}` : undefined}
          title={collapsed ? `${dict.brand.name} ${dict.nav.dashboard}` : undefined}
          className="flex items-center gap-2.5 overflow-hidden"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none">
                {dict.brand.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {dict.brand.tagline}
              </p>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          aria-label={collapsed ? dict.nav.expandSidebar : dict.nav.collapseSidebar}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          ) : (
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={dict.nav.closeNavigation}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        <Button asChild className={cn("w-full", collapsed && "px-0")}>
          <Link
            href="/cases/new"
            onClick={() => setMobileOpen(false)}
            aria-label={collapsed ? dict.nav.newSurgicalCase : undefined}
            title={collapsed ? dict.nav.newSurgicalCase : undefined}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>{dict.nav.newSurgicalCase}</span>}
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-2">
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {dict.nav.clinicalLibrary}
            </p>
          )}
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const label = dict.nav[item.labelKey];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="space-y-0.5 border-t border-slate-200 dark:border-slate-800 pt-4">
          {!collapsed && (
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {dict.nav.accountCollaboration}
            </p>
          )}
          {ACCOUNT_NAV.map((item) => {
            const Icon = item.icon;
            const label = dict.nav[item.labelKey];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <div
          className={cn(
            "flex items-center gap-2.5",
            collapsed && "justify-center",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-blue-600 text-xs font-medium text-white">
            {getInitials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label={collapsed ? dict.nav.signOut : undefined}
          title={collapsed ? dict.nav.signOut : undefined}
          className={cn(
            "mt-2 w-full justify-start text-slate-600 hover:text-red-700 dark:text-slate-300 dark:hover:text-red-400",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-4 w-4 rtl:rotate-180" />
          {!collapsed && (
            <span>{signingOut ? dict.nav.signingOut : dict.nav.signOut}</span>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:start-0 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 z-30",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-dialog-overlay fixed inset-0 bg-slate-900/40 dark:bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="animate-drawer-in fixed inset-y-0 start-0 w-64 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 shadow-lg z-10">
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
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label={dict.nav.openNavigation}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.hospital ?? dict.brand.defaultHospital}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!user.emailVerified && (
              <span className="hidden sm:inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
                {dict.common.emailUnverified}
              </span>
            )}
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/profile"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white truncate max-w-[140px] sm:max-w-none"
            >
              {user.name}
            </Link>
          </div>
        </header>

        <main
          key={pathname}
          className="animate-fade-up flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
