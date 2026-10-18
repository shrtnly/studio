"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DEFAULT_SETTINGS, isMissingTableError, loadSettings, saveSettings, type LocalSettings } from "@/lib/admin-data";
import { InitialsAvatar, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Mail,
  Bell,
  Palette,
  ShieldCheck,
  Database,
  Sun,
  Moon,
  Loader2,
  CheckCircle2,
  XCircle,
  KeyRound,
  LogOut,
  Save,
} from "lucide-react";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "email", label: "Email", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "database", label: "Database", icon: Database },
];

const TABLES = ["jobs", "candidates", "leads", "email_logs", "Admin_User"];

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, adminUser, checkApproval, signOut } = useAuth();

  const [active, setActive] = useState("profile");
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [prefs, setPrefs] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [tableStatus, setTableStatus] = useState<Record<string, boolean | null>>({});
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setFullName(adminUser?.full_name || "");
  }, [adminUser]);

  useEffect(() => {
    setPrefs(loadSettings());
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const checkTables = async () => {
    setTableStatus(Object.fromEntries(TABLES.map((t) => [t, null])));
    const sb = getSupabase();
    const results = await Promise.all(
      TABLES.map(async (t) => {
        const { error } = await sb.from(t).select("*", { head: true, count: "exact" }).limit(1);
        return [t, !(error && isMissingTableError(error))] as const;
      })
    );
    setTableStatus(Object.fromEntries(results));
  };

  useEffect(() => {
    checkTables();
  }, []);

  const updatePrefs = (p: Partial<LocalSettings>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    saveSettings(next);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await getSupabase().from("Admin_User").update({ full_name: fullName.trim() }).eq("id", user.id);
      if (error) throw error;
      await checkApproval();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not update profile", description: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const applyTheme = (t: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("talento-theme", t);
    setTheme(t);
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setResetting(true);
    const { error } = await getSupabase().auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetting(false);
    if (error) toast({ variant: "destructive", title: "Could not send reset email", description: error.message });
    else toast({ title: "Password reset email sent", description: user.email });
  };

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Row = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Workspace" title="Settings" description="Manage your profile, email defaults, preferences and workspace health." />

      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        {/* Section nav */}
        <nav className="hidden md:block">
          <ul className="sticky top-24 space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active === s.id ? "bg-foreground/[0.06] font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <s.icon className={cn("h-4 w-4", active === s.id && "text-accent")} />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {/* Profile */}
          <div id="section-profile" className="scroll-mt-24">
            <Panel title="Profile" description="How you appear across the admin studio.">
              <div className="mb-5 flex items-center gap-4">
                <InitialsAvatar name={fullName || user?.email} size="lg" />
                <div>
                  <p className="font-medium capitalize">{fullName || user?.email?.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium capitalize text-emerald-500">
                    <ShieldCheck className="h-3 w-3" />{adminUser?.role || "admin"} · approved
                  </span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-name">Full name</Label>
                  <Input id="s-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">Email</Label>
                  <Input id="s-email" value={user?.email || ""} disabled />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={saveProfile} disabled={savingProfile || fullName === (adminUser?.full_name || "")} id="save-profile">
                  {savingProfile ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save profile
                </Button>
              </div>
            </Panel>
          </div>

          {/* Email */}
          <div id="section-email" className="scroll-mt-24">
            <Panel title="Email defaults" description="Used when composing from the Email page. Saved in this browser.">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-sender">Sender name</Label>
                  <Input id="s-sender" value={prefs.senderName} onChange={(e) => updatePrefs({ senderName: e.target.value })} placeholder={fullName || "Talento Talent Team"} />
                  <p className="text-[11px] text-muted-foreground">Replaces <code>{"{{sender_name}}"}</code> in templates.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-signature">Signature</Label>
                  <Textarea id="s-signature" rows={4} value={prefs.signature} onChange={(e) => updatePrefs({ signature: e.target.value })} />
                </div>
              </div>
            </Panel>
          </div>

          {/* Notifications */}
          <div id="section-notifications" className="scroll-mt-24">
            <Panel title="Notifications" description="Choose what you'd like to be alerted about.">
              <div className="divide-y divide-border/50">
                <Row title="New candidate applications" desc="When someone applies to an open role">
                  <Switch checked={prefs.notifyNewCandidate} onCheckedChange={(v) => updatePrefs({ notifyNewCandidate: v })} />
                </Row>
                <Row title="New leads" desc="When a new lead is added to the pipeline">
                  <Switch checked={prefs.notifyNewLead} onCheckedChange={(v) => updatePrefs({ notifyNewLead: v })} />
                </Row>
                <Row title="Weekly digest" desc="A Monday summary of hiring activity">
                  <Switch checked={prefs.weeklyDigest} onCheckedChange={(v) => updatePrefs({ weeklyDigest: v })} />
                </Row>
              </div>
            </Panel>
          </div>

          {/* Appearance */}
          <div id="section-appearance" className="scroll-mt-24">
            <Panel title="Appearance" description="Customize how the studio looks on this device.">
              <div className="grid grid-cols-2 gap-3">
                {([["light", Sun, "Light"], ["dark", Moon, "Dark"]] as const).map(([t, Icon, label]) => (
                  <button
                    key={t}
                    onClick={() => applyTheme(t)}
                    className={cn(
                      "group overflow-hidden rounded-xl border text-left transition-all",
                      theme === t ? "border-accent ring-2 ring-accent/20" : "border-border/60 hover:border-border"
                    )}
                  >
                    <div className={cn("flex h-24 gap-2 p-3", t === "dark" ? "bg-[#0f1729]" : "bg-[#f4f6f9]")}>
                      <div className={cn("w-1/4 rounded-md", t === "dark" ? "bg-white/5" : "bg-white")} />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className={cn("h-3 w-2/3 rounded", t === "dark" ? "bg-white/10" : "bg-slate-200")} />
                        <div className={cn("flex-1 rounded-md", t === "dark" ? "bg-white/5" : "bg-white")} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
                      <Icon className="h-4 w-4" />{label}
                      {theme === t && <CheckCircle2 className="ml-auto h-4 w-4 text-accent" />}
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          {/* Security */}
          <div id="section-security" className="scroll-mt-24">
            <Panel title="Security" description="Account access and sessions.">
              <div className="divide-y divide-border/50">
                <Row title="Password" desc="We'll email you a secure link to set a new password">
                  <Button size="sm" variant="outline" onClick={sendReset} disabled={resetting}>
                    {resetting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1.5 h-4 w-4" />}
                    Reset password
                  </Button>
                </Row>
                <Row title="Sign out" desc="End your session on this device">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                    onClick={async () => {
                      await signOut();
                      router.replace("/login");
                    }}
                  >
                    <LogOut className="mr-1.5 h-4 w-4" />Sign out
                  </Button>
                </Row>
              </div>
            </Panel>
          </div>

          {/* Database */}
          <div id="section-database" className="scroll-mt-24">
            <Panel
              title="Database health"
              description="Supabase tables used by the dashboard."
              action={<Button size="sm" variant="ghost" onClick={checkTables}>Re-check</Button>}
            >
              <ul className="divide-y divide-border/50">
                {TABLES.map((t) => {
                  const ok = tableStatus[t];
                  return (
                    <li key={t} className="flex items-center justify-between py-2.5 text-sm">
                      <code className="text-xs">{t}</code>
                      {ok === null || ok === undefined ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : ok ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-500"><CheckCircle2 className="h-4 w-4" />Connected</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-amber-500"><XCircle className="h-4 w-4" />Missing: run migration</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
