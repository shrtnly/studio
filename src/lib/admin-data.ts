"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { CandidateStage, LeadStatus } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Pipeline / status metadata                                          */
/* ------------------------------------------------------------------ */

export const CANDIDATE_STAGES: {
  value: CandidateStage;
  label: string;
  dot: string;
  chip: string;
}[] = [
  { value: "applied", label: "Applied", dot: "bg-sky-400", chip: "bg-sky-500/10 text-sky-500 dark:text-sky-300 ring-sky-500/20" },
  { value: "screening", label: "Screening", dot: "bg-violet-400", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300 ring-violet-500/20" },
  { value: "interview", label: "Interview", dot: "bg-amber-400", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-amber-500/20" },
  { value: "offer", label: "Offer", dot: "bg-orange-400", chip: "bg-orange-500/10 text-orange-600 dark:text-orange-300 ring-orange-500/20" },
  { value: "hired", label: "Hired", dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20" },
  { value: "rejected", label: "Rejected", dot: "bg-rose-400", chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-rose-500/20" },
];

export const LEAD_STATUSES: {
  value: LeadStatus;
  label: string;
  dot: string;
  chip: string;
}[] = [
  { value: "new", label: "New", dot: "bg-sky-400", chip: "bg-sky-500/10 text-sky-500 dark:text-sky-300 ring-sky-500/20" },
  { value: "contacted", label: "Contacted", dot: "bg-violet-400", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300 ring-violet-500/20" },
  { value: "qualified", label: "Qualified", dot: "bg-amber-400", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-amber-500/20" },
  { value: "proposal", label: "Proposal", dot: "bg-orange-400", chip: "bg-orange-500/10 text-orange-600 dark:text-orange-300 ring-orange-500/20" },
  { value: "won", label: "Won", dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20" },
  { value: "lost", label: "Lost", dot: "bg-rose-400", chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-rose-500/20" },
];

export const LEAD_SOURCES = ["Website", "Referral", "LinkedIn", "Cold Outreach", "Event", "Partner", "Other"];
export const CANDIDATE_SOURCES = ["Careers Page", "LinkedIn", "Referral", "Job Board", "Agency", "Other"];

export const stageMeta = (s: string) => CANDIDATE_STAGES.find((x) => x.value === s) ?? CANDIDATE_STAGES[0];
export const leadMeta = (s: string) => LEAD_STATUSES.find((x) => x.value === s) ?? LEAD_STATUSES[0];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function isAbortError(err: any) {
  return (
    err?.name === "AbortError" ||
    err?.message?.includes("aborted") ||
    err?.message?.includes("signal is aborted")
  );
}

/** True when Supabase reports the table hasn't been created yet. */
export function isMissingTableError(err: any) {
  const msg: string = err?.message || "";
  return (
    err?.code === "42P01" ||
    err?.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("Could not find the table")
  );
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const AVATAR_GRADIENTS = [
  "from-sky-500 to-indigo-500",
  "from-orange-400 to-rose-500",
  "from-emerald-400 to-teal-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-blue-500",
];

export function avatarGradient(seed?: string | null) {
  const s = seed || "x";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Generic Supabase table hook                                         */
/* ------------------------------------------------------------------ */

export function useSupabaseTable<T>(
  table: string,
  opts: { orderBy?: string; ascending?: boolean; enabled?: boolean } = {}
) {
  const { orderBy = "created_at", ascending = false, enabled = true } = opts;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data: rows, error: err } = await getSupabase()
        .from(table)
        .select("*")
        .order(orderBy, { ascending });
      if (err) throw err;
      setData((rows as T[]) || []);
      setError(null);
      setMissing(false);
    } catch (err: any) {
      if (isAbortError(err)) return;
      if (isMissingTableError(err)) {
        setMissing(true);
        setData([]);
      } else {
        setError(err?.message || "Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  }, [table, orderBy, ascending, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, setData, loading, error, missing, refresh };
}

/* ------------------------------------------------------------------ */
/* Email templates                                                     */
/* ------------------------------------------------------------------ */

export interface EmailTemplate {
  id: string;
  name: string;
  audience: "candidate" | "lead" | "any";
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "interview_invite",
    name: "Interview invitation",
    audience: "candidate",
    subject: "Interview invitation — {{job_title}} at Talento",
    body:
      "Hi {{first_name}},\n\nThank you for applying for the {{job_title}} role. We enjoyed reviewing your profile and would love to invite you to an interview.\n\nCould you share a few time slots that work for you this week?\n\nBest regards,\n{{sender_name}}",
  },
  {
    id: "application_received",
    name: "Application received",
    audience: "candidate",
    subject: "We received your application — {{job_title}}",
    body:
      "Hi {{first_name}},\n\nThanks for your interest in Talento! We've received your application for {{job_title}} and our team is reviewing it. We'll get back to you within 5 business days.\n\nWarm regards,\n{{sender_name}}",
  },
  {
    id: "offer",
    name: "Offer letter",
    audience: "candidate",
    subject: "Offer — {{job_title}} at Talento 🎉",
    body:
      "Hi {{first_name}},\n\nCongratulations! We're delighted to offer you the position of {{job_title}} at Talento. Please find the details attached; we'd love to hear from you by the end of the week.\n\nWelcome aboard,\n{{sender_name}}",
  },
  {
    id: "rejection",
    name: "Polite rejection",
    audience: "candidate",
    subject: "Your application for {{job_title}}",
    body:
      "Hi {{first_name}},\n\nThank you for the time you invested in applying for {{job_title}}. After careful consideration, we've decided to move forward with other candidates whose experience more closely matches our current needs.\n\nWe'll keep your profile on file for future opportunities.\n\nKind regards,\n{{sender_name}}",
  },
  {
    id: "lead_intro",
    name: "Lead introduction",
    audience: "lead",
    subject: "Talento × {{company}} — building your team",
    body:
      "Hi {{first_name}},\n\nI'm reaching out from Talento. We help growing companies like {{company}} hire top engineering and product talent quickly.\n\nWould you be open to a 20-minute call next week?\n\nBest,\n{{sender_name}}",
  },
  {
    id: "lead_followup",
    name: "Lead follow-up",
    audience: "lead",
    subject: "Following up — Talento",
    body:
      "Hi {{first_name}},\n\nJust following up on my previous note. Happy to share a few candidate profiles relevant to {{company}} if helpful.\n\nCheers,\n{{sender_name}}",
  },
];

export function fillTemplate(text: string, vars: Record<string, string | undefined | null>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] ?? "").toString() || `{{${key}}}`);
}

/* ------------------------------------------------------------------ */
/* Local settings (stored in browser)                                  */
/* ------------------------------------------------------------------ */

export interface LocalSettings {
  senderName: string;
  signature: string;
  notifyNewCandidate: boolean;
  notifyNewLead: boolean;
  weeklyDigest: boolean;
  compactTables: boolean;
}

export const DEFAULT_SETTINGS: LocalSettings = {
  senderName: "",
  signature: "—\nTalento Talent Team\ntalento.com",
  notifyNewCandidate: true,
  notifyNewLead: true,
  weeklyDigest: false,
  compactTables: false,
};

const SETTINGS_KEY = "talento-admin-settings";

export function loadSettings(): LocalSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: LocalSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
