"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InitialsAvatar } from "@/components/admin/ui";
import {
  LayoutDashboard,
  PlusCircle,
  Target,
  Users,
  Mail,
  Settings,
  ChevronsLeft,
  Menu,
  Search,
  LogOut,
  ExternalLink,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon; desc: string };

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, desc: "Overview, analytics & job listings" },
  { label: "Post a Job", href: "/admin/post-job", icon: PlusCircle, desc: "Create and publish a new role" },
  { label: "Leads", href: "/admin/leads", icon: Target, desc: "Clients & business pipeline" },
  { label: "Candidates", href: "/admin/candidates", icon: Users, desc: "Hiring pipeline & applicants" },
  { label: "Email", href: "/admin/email", icon: Mail, desc: "Compose & email history" },
  { label: "Settings", href: "/admin/settings", icon: Settings, desc: "Profile & preferences" },
];

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 50" className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth="2.2" fill="none">
        <path d="M 26 1.02 A 24 24 0 1 1 24 1.02" />
        <circle cx="25" cy="25" r="16" />
        <circle cx="25" cy="25" r="8" />
      </g>
      <circle cx="25" cy="25" r="2.5" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar contents (shared by desktop + mobile)                       */
/* ------------------------------------------------------------------ */
function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, adminUser, signOut } = useAuth();
  const name = adminUser?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-rose-500 text-white shadow-md shadow-accent/30">
            <LogoMark className="h-5 w-5" />
          </span>
          {!collapsed && (
            <span className="leading-tight">
              <span className="block text-sm font-bold font-headline tracking-wide">TALENTO</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Admin Studio</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {!collapsed && (
          <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Menu
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                collapsed && "justify-center px-0",
                active
                  ? "bg-foreground/[0.06] text-foreground dark:bg-white/[0.06]"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active ? "text-accent" : "group-hover:text-foreground"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className={cn("pt-4", collapsed && "flex justify-center")}>
          <Link
            href="/"
            target="_blank"
            title="Live careers site"
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <ExternalLink className="h-4 w-4" />
            {!collapsed && "Live careers site"}
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-border/60 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-foreground/[0.04]",
                collapsed && "justify-center"
              )}
            >
              <InitialsAvatar name={name} size="sm" />
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium capitalize">{name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{user?.email}</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{adminUser?.role || "admin"}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-500 focus:text-rose-500"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Command palette                                                     */
/* ------------------------------------------------------------------ */
function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const actions = useMemo(
    () => [
      ...NAV_ITEMS.map((n) => ({ label: n.label, desc: n.desc, icon: n.icon, href: n.href })),
      { label: "Add a candidate", desc: "Candidates → New", icon: Users, href: "/admin/candidates?new=1" },
      { label: "Add a lead", desc: "Leads → New", icon: Target, href: "/admin/leads?new=1" },
      { label: "Compose email", desc: "Email → Compose", icon: Mail, href: "/admin/email" },
    ],
    []
  );

  const results = actions.filter(
    (a) => !q || a.label.toLowerCase().includes(q.toLowerCase()) || a.desc.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => {
    setIdx(0);
  }, [q, open]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[22%] translate-y-0 gap-0 overflow-hidden rounded-xl p-0 sm:max-w-lg [&>button]:hidden">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border/60 px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[idx]) {
                go(results[idx].href);
              }
            }}
            placeholder="Search pages and actions…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No results</p>}
          {results.map((r, i) => {
            const Icon = r.icon;
            return (
              <button
                key={r.label}
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(r.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  i === idx ? "bg-foreground/[0.06]" : ""
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.desc}</span>
                </span>
                {i === idx && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("talento-sidebar-collapsed") === "1");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("talento-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  };

  const current = NAV_ITEMS.find((n) => isActive(pathname, n.href));

  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-40 right-[-10%] h-[420px] w-[620px] rounded-full bg-accent/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[10%] h-[380px] w-[520px] rounded-full bg-sky-500/[0.06] blur-[120px]" />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border/60 bg-card/50 backdrop-blur-xl transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <SidebarBody collapsed={collapsed} />
        <button
          onClick={toggleCollapsed}
          aria-label="Toggle sidebar"
          className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-all hover:text-foreground"
        >
          <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className={cn("relative z-10 transition-[padding] duration-300 ease-out", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden items-center gap-2 text-sm sm:flex">
            <span className="text-muted-foreground">Admin</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium">{current?.label ?? "Dashboard"}</span>
          </div>

          <button
            id="open-command-palette"
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/70"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
          </button>

          <ThemeToggle />
          <Button asChild size="sm" className="hidden bg-accent font-semibold text-accent-foreground shadow-md shadow-accent/20 hover:bg-accent/90 md:inline-flex">
            <Link href="/admin/post-job">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Post a Job
            </Link>
          </Button>
        </header>

        <main key={pathname} className="animate-in fade-in duration-300">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
