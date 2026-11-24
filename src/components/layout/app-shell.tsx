"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Activity,
  CalendarClock,
  ChevronDown,
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
import { NavigationProgress } from "@/components/layout/navigation-progress";

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
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const desktopExpanded = !collapsed || hovered;

  // Lock body scroll and support Escape key while the mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

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

  function getBreadcrumbs(): { label: string; href?: string }[] {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [{ label: dict.nav.dashboard }];

    const rootMap: Record<string, string> = {
      dashboard: dict.nav.dashboard,
      cases: dict.nav.myCases,
      shared: dict.nav.sharedWithMe,
      "shared-by-me": dict.nav.sharedByMe,
      "follow-ups": dict.nav.followUps,
      media: dict.nav.medicalMedia,
      invitations: dict.nav.invitations,
      activity: dict.nav.activityLog,
      profile: dict.nav.profile,
      settings: dict.nav.settings,
    };

    const first = segments[0]!;
    const crumbs: { label: string; href?: string }[] = [
      {
        label: rootMap[first] ?? first,
        href: segments.length > 1 ? `/${first}` : undefined,
      },
    ];

    if (first === "cases" && segments[1]) {
      const second = segments[1];
      if (second === "new") {
        crumbs.push({ label: dict.dashboard.newCase });
      } else if (second === "compare") {
        crumbs.push({ label: dict.cases.compareCases });
      } else {
        crumbs.push({
          label: "Case Details",
          href: segments[2] ? `/cases/${second}` : undefined,
        });
        if (segments[2] === "edit") {
          crumbs.push({ label: dict.common.edit });
        }
      }
    } else if (first === "settings" && segments[1] === "security") {
      crumbs.push({ label: dict.nav.security });
    }

    return crumbs;
  }

  const breadcrumbs = getBreadcrumbs();

  const renderSidebarContent = (compact: boolean) => (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative flex h-14 items-center border-b border-slate-200 dark:border-slate-800 px-4 overflow-hidden">
        <Link
          href="/dashboard"
          aria-label={compact ? `${dict.brand.name} ${dict.nav.dashboard}` : undefined}
          title={compact ? `${dict.brand.name} ${dict.nav.dashboard}` : undefined}
          className="flex items-center gap-2.5 min-w-0 pe-8"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div
            aria-hidden={compact}
            className={cn(
              "min-w-0 truncate transition-opacity duration-150",
              compact ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none whitespace-nowrap">
              {dict.brand.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
              {dict.brand.tagline}
            </p>
          </div>
        </Link>

        <button
          type="button"
          tabIndex={compact ? -1 : 0}
          aria-hidden={compact}
          onClick={() => {
            if (!collapsed) {
              setHovered(false);
            }
            setCollapsed((c) => !c);
          }}
          className={cn(
            "hidden lg:inline-flex absolute end-3 top-1/2 -translate-y-1/2 h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer transition-opacity duration-150",
            compact ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          aria-label={collapsed ? dict.nav.expandSidebar : dict.nav.collapseSidebar}
          title={collapsed ? dict.nav.expandSidebar : dict.nav.collapseSidebar}
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
          className="lg:hidden absolute end-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={dict.nav.closeNavigation}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-2.5">
        <Button
          asChild
          variant="outline"
          className="w-full justify-start gap-2.5 px-[13px] overflow-hidden whitespace-nowrap border-blue-200/80 bg-blue-50/60 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70 dark:hover:text-blue-200"
        >
          <Link
            href="/cases/new"
            onClick={() => setMobileOpen(false)}
            aria-label={compact ? dict.nav.newSurgicalCase : undefined}
            title={compact ? dict.nav.newSurgicalCase : undefined}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "truncate transition-opacity duration-150",
                compact ? "opacity-0" : "opacity-100",
              )}
            >
              {dict.nav.newSurgicalCase}
            </span>
          </Link>
        </Button>
      </div>

      <nav className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-2.5 py-1">
        <div className="space-y-0.5">
          <p
            aria-hidden={compact}
            className={cn(
              "h-5 flex items-center px-[14px] text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap overflow-hidden transition-opacity duration-150",
              compact ? "opacity-0" : "opacity-100",
            )}
          >
            {dict.nav.clinicalLibrary}
          </p>
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const label = dict.nav[item.labelKey];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={compact ? label : undefined}
                aria-label={compact ? label : undefined}
                className={cn(
                  "flex items-center justify-start gap-2.5 rounded-md px-[14px] py-1.5 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden",
                  active
                    ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
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
                <span
                  className={cn(
                    "truncate transition-opacity duration-150",
                    compact ? "opacity-0" : "opacity-100",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="space-y-0.5 border-t border-slate-200 dark:border-slate-800 pt-2">
          <p
            aria-hidden={compact}
            className={cn(
              "h-5 flex items-center px-[14px] text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap overflow-hidden transition-opacity duration-150",
              compact ? "opacity-0" : "opacity-100",
            )}
          >
            {dict.nav.accountCollaboration}
          </p>
          {ACCOUNT_NAV.map((item) => {
            const Icon = item.icon;
            const label = dict.nav[item.labelKey];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={compact ? label : undefined}
                aria-label={compact ? label : undefined}
                className={cn(
                  "flex items-center justify-start gap-2.5 rounded-md px-[14px] py-1.5 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden",
                  active
                    ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
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
                <span
                  className={cn(
                    "truncate transition-opacity duration-150",
                    compact ? "opacity-0" : "opacity-100",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={() => {
          if (collapsed) setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:start-0 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-[width,box-shadow] duration-200 ease-out z-30",
          desktopExpanded ? "lg:w-64" : "lg:w-16",
          collapsed && hovered && "shadow-xl dark:shadow-black/50",
        )}
      >
        {renderSidebarContent(!desktopExpanded)}
      </aside>

      {/* Mobile Drawer (kept mounted so both open & close slide smoothly in LTR/RTL) */}
      <div
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-[visibility] duration-200",
          mobileOpen ? "visible" : "invisible pointer-events-none",
        )}
      >
        <div
          className={cn(
            "fixed inset-0 bg-slate-900/45 dark:bg-black/65 backdrop-blur-[1px] transition-opacity duration-200 ease-out",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartXRef.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
            const deltaX = endX - touchStartXRef.current;
            touchStartXRef.current = null;
            const isRtl = document.documentElement.dir === "rtl";
            if ((!isRtl && deltaX < -50) || (isRtl && deltaX > 50)) {
              setMobileOpen(false);
            }
          }}
          className={cn(
            "fixed inset-y-0 start-0 w-64 max-w-[82vw] bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 shadow-xl z-10 transition-transform duration-200 ease-out will-change-transform",
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full rtl:translate-x-full",
          )}
        >
          {renderSidebarContent(false)}
        </aside>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex flex-1 flex-col min-w-0 transition-all duration-200",
          collapsed ? "lg:ps-16" : "lg:ps-64",
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label={dict.nav.openNavigation}
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0"
            >
              {breadcrumbs.map((crumb, idx) => (
                <Fragment key={`${crumb.label}-${idx}`}>
                  {idx > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-600 rtl:rotate-180" />
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="truncate hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {crumb.label}
                    </span>
                  )}
                </Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!user.emailVerified && (
              <span className="hidden sm:inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
                {dict.common.emailUnverified}
              </span>
            )}
            <LanguageToggle />
            <ThemeToggle />

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 py-1 ps-1 pe-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-blue-600 text-[11px] font-semibold text-white">
                    {getInitials(user.name)}
                  </span>
                  <span className="hidden sm:inline truncate max-w-[140px]">
                    {user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-56 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-lg text-sm"
                >
                  <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    {user.hospital && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {user.hospital}
                      </p>
                    )}
                  </div>

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer"
                    >
                      <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      {dict.nav.profile}
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer"
                    >
                      <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      {dict.nav.settings}
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings/security"
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer"
                    >
                      <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      {dict.nav.security}
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                  <DropdownMenu.Item
                    disabled={signingOut}
                    onSelect={(e) => {
                      e.preventDefault();
                      void handleSignOut();
                    }}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 outline-none cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 rtl:rotate-180" />
                    {signingOut ? dict.nav.signingOut : dict.nav.signOut}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
