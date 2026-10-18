"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Candidate, Job, Lead } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  CANDIDATE_STAGES,
  LEAD_STATUSES,
  stageMeta,
  timeAgo,
  useSupabaseTable,
} from "@/lib/admin-data";
import {
  EmptyState,
  FilterPills,
  InitialsAvatar,
  MissingTableNotice,
  NativeSelect,
  PageHeader,
  Panel,
  StatCard,
  StatusChip,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Briefcase,
  Users,
  Target,
  Trophy,
  RefreshCw,
  PlusCircle,
  Search,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Trash2,
  Loader2,
  MapPin,
  ArrowRight,
  Mail,
  UserPlus,
  Inbox,
} from "lucide-react";

const PIE_COLORS = ["#fb923c", "#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#2dd4bf"];

type Range = "7" | "30" | "90";

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const { adminUser, user } = useAuth();
  const name = (adminUser?.full_name || user?.email?.split("@")[0] || "there").split(" ")[0];

  const jobsQ = useSupabaseTable<Job>("jobs");
  const candQ = useSupabaseTable<Candidate>("candidates");
  const leadQ = useSupabaseTable<Lead>("leads");

  const jobs = jobsQ.data;
  const candidates = candQ.data;
  const leads = leadQ.data;

  const [range, setRange] = useState<Range>("30");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedWorkplace, setSelectedWorkplace] = useState("all");
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshAll = () => {
    jobsQ.refresh();
    candQ.refresh();
    leadQ.refresh();
  };

  /* ------------------------------ Metrics ------------------------------ */
  const metrics = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    const inWindow = (iso: string, from: number, to: number) => {
      const t = new Date(iso).getTime();
      return t >= now - from * DAY && t < now - to * DAY;
    };
    const cur = candidates.filter((c) => inWindow(c.created_at, 30, 0)).length;
    const prev = candidates.filter((c) => inWindow(c.created_at, 60, 30)).length;
    const trend = prev === 0 ? (cur > 0 ? 100 : null) : Math.round(((cur - prev) / prev) * 100);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const hiredThisMonth = candidates.filter(
      (c) => c.stage === "hired" && new Date(c.updated_at || c.created_at) >= monthStart
    ).length;

    const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.status)).length;
    const pipelineValue = leads
      .filter((l) => !["lost"].includes(l.status))
      .reduce((s, l) => s + (Number(l.value) || 0), 0);

    return { trend, hiredThisMonth, activeLeads, pipelineValue, newCandidates30: cur };
  }, [candidates, leads]);

  /* --------------------------- Time series ----------------------------- */
  const series = useMemo(() => {
    const days = parseInt(range, 10);
    const buckets: { date: string; label: string; candidates: number; jobs: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      buckets.push({
        date: localKey(d),
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        candidates: 0,
        jobs: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.date, i]));
    const bump = (iso: string | undefined, key: "candidates" | "jobs") => {
      if (!iso) return;
      const i = idx.get(localKey(new Date(iso)));
      if (i !== undefined) buckets[i][key]++;
    };
    candidates.forEach((c) => bump(c.created_at, "candidates"));
    jobs.forEach((j) => bump(j.created_at, "jobs"));
    return buckets;
  }, [candidates, jobs, range]);

  const stageCounts = useMemo(
    () =>
      CANDIDATE_STAGES.map((s) => ({
        ...s,
        count: candidates.filter((c) => c.stage === s.value).length,
      })),
    [candidates]
  );
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count));

  const deptData = useMemo(() => {
    const m = new Map<string, number>();
    jobs.forEach((j) => m.set(j.department || "General", (m.get(j.department || "General") || 0) + 1));
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [jobs]);

  const candCountByJob = useMemo(() => {
    const m = new Map<string, number>();
    candidates.forEach((c) => c.job_id && m.set(c.job_id, (m.get(c.job_id) || 0) + 1));
    return m;
  }, [candidates]);

  /* ------------------------------ Jobs table ---------------------------- */
  const departments = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))).sort(),
    [jobs]
  );
  const workplaces = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.workplace).filter(Boolean))).sort(),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return jobs.filter((job) => {
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.id.toLowerCase().includes(q) ||
        job.department?.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (selectedDept === "all" || job.department === selectedDept) &&
        (selectedWorkplace === "all" || job.workplace === selectedWorkplace)
      );
    });
  }, [jobs, searchQuery, selectedDept, selectedWorkplace]);

  const handleCopyLink = (jobId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}`);
    toast({ title: "Link copied", description: "Public job link copied to clipboard." });
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await getSupabase().from("jobs").delete().eq("id", jobToDelete.id);
      if (error) throw error;
      toast({ title: "Job deleted", description: `"${jobToDelete.title}" was removed.` });
      jobsQ.setData((prev) => prev.filter((j) => j.id !== jobToDelete.id));
      setJobToDelete(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const loading = jobsQ.loading || candQ.loading || leadQ.loading;
  const recentCandidates = candidates.slice(0, 5);
  const jobTitle = (id: string | null) => jobs.find((j) => j.id === id)?.title;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${name.charAt(0).toUpperCase() + name.slice(1)}`}
        description="Here's what's happening across your hiring and business pipeline."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading} id="dashboard-refresh">
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="md:hidden">
              <Link href="/admin/post-job">
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Post a Job
              </Link>
            </Button>
          </>
        }
      />

      {(candQ.missing || leadQ.missing) && (
        <div className="mb-6">
          <MissingTableNotice table={candQ.missing ? "candidates" : "leads"} />
        </div>
      )}

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Open roles" value={jobs.length} icon={Briefcase} hint={`${departments.length} departments`} tone="primary" href="#jobs" />
            <StatCard
              label="Candidates"
              value={candidates.length}
              icon={Users}
              trend={metrics.trend}
              hint={`${metrics.newCandidates30} new in last 30 days`}
              tone="violet"
              href="/admin/candidates"
            />
            <StatCard
              label="Active leads"
              value={metrics.activeLeads}
              icon={Target}
              hint={metrics.pipelineValue ? `৳${metrics.pipelineValue.toLocaleString()} pipeline` : `${leads.length} total leads`}
              tone="accent"
              href="/admin/leads"
            />
            <StatCard label="Hired this month" value={metrics.hiredThisMonth} icon={Trophy} hint="Moved to Hired stage" tone="emerald" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Activity"
          description="New candidates and jobs posted"
          action={
            <FilterPills<Range>
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "7D" },
                { value: "30", label: "30D" },
                { value: "90", label: "90D" },
              ]}
            />
          }
        >
          <div className="h-[260px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--border))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="candidates" name="Candidates" stroke="#fb923c" strokeWidth={2} fill="url(#gCand)" />
                <Area type="monotone" dataKey="jobs" name="Jobs posted" stroke="#38bdf8" strokeWidth={2} fill="url(#gJobs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" />Candidates</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" />Jobs posted</span>
          </div>
        </Panel>

        <Panel
          title="Hiring pipeline"
          description={`${candidates.length} candidates across stages`}
          action={
            <Link href="/admin/candidates" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              View all
            </Link>
          }
        >
          <div className="space-y-3.5 pt-1">
            {stageCounts.map((s) => (
              <Link key={s.value} href={`/admin/candidates?stage=${s.value}`} className="group block">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground group-hover:text-foreground">{s.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.dot} transition-all duration-700 ease-out`}
                    style={{ width: `${(s.count / maxStage) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Lists row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Recent candidates"
          action={
            <Link href="/admin/candidates" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Open pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          }
          bodyClassName="px-2 pb-2"
        >
          {recentCandidates.length === 0 ? (
            <div className="px-3 pb-3">
              <EmptyState
                icon={Inbox}
                title="No candidates yet"
                description="Add candidates manually or connect your careers page apply form."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/candidates?new=1"><UserPlus className="mr-1.5 h-4 w-4" />Add candidate</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {recentCandidates.map((c) => {
                const m = stageMeta(c.stage);
                return (
                  <li key={c.id}>
                    <Link href={`/admin/candidates?id=${c.id}`} className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-foreground/[0.03]">
                      <InitialsAvatar name={c.full_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{jobTitle(c.job_id) || "General application"}</p>
                      </div>
                      <StatusChip label={m.label} chip={m.chip} dot={m.dot} />
                      <span className="hidden w-16 text-right text-xs text-muted-foreground sm:block">{timeAgo(c.created_at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="grid gap-4">
          <Panel title="Roles by department">
            {deptData.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No jobs posted yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-[120px] w-[120px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deptData} dataKey="value" innerRadius={38} outerRadius={56} paddingAngle={3} stroke="none">
                        {deptData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                  {deptData.slice(0, 5).map((d, i) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="tabular-nums text-muted-foreground">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Quick actions" bodyClassName="grid grid-cols-2 gap-2">
            {[
              { label: "Post job", href: "/admin/post-job", icon: PlusCircle },
              { label: "Add candidate", href: "/admin/candidates?new=1", icon: UserPlus },
              { label: "Add lead", href: "/admin/leads?new=1", icon: Target },
              { label: "Send email", href: "/admin/email", icon: Mail },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="group flex flex-col gap-2 rounded-lg border border-border/60 p-3 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/[0.04]"
              >
                <a.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-accent" />
                {a.label}
              </Link>
            ))}
          </Panel>
        </div>
      </div>

      {/* Lead status strip */}
      {leads.length > 0 && (
        <Panel title="Lead pipeline" className="mb-6" action={<Link href="/admin/leads" className="text-xs font-medium text-muted-foreground hover:text-foreground">Manage</Link>}>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            {LEAD_STATUSES.map((s) => {
              const n = leads.filter((l) => l.status === s.value).length;
              return n ? <div key={s.value} className={`${s.dot} transition-all`} style={{ width: `${(n / leads.length) * 100}%` }} title={`${s.label}: ${n}`} /> : null;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            {LEAD_STATUSES.map((s) => (
              <span key={s.value} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {s.label}
                <span className="font-medium tabular-nums text-foreground">{leads.filter((l) => l.status === s.value).length}</span>
              </span>
            ))}
          </div>
        </Panel>
      )}

      {/* Job listings */}
      <div id="jobs" className="scroll-mt-20">
        <Panel
          title="Job listings"
          description={`${filteredJobs.length} of ${jobs.length} roles`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/post-job"><PlusCircle className="mr-1.5 h-4 w-4" />New</Link>
            </Button>
          }
          bodyClassName="px-0 pb-0"
        >
          <div className="flex flex-col gap-2 border-y border-border/60 bg-muted/20 px-5 py-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="jobs-search"
                placeholder="Search title, ID or department…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg bg-background pl-9"
              />
            </div>
            <NativeSelect value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="sm:w-48">
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </NativeSelect>
            <NativeSelect value={selectedWorkplace} onChange={(e) => setSelectedWorkplace(e.target.value)} className="sm:w-48">
              <option value="all">All locations</option>
              {workplaces.map((w) => <option key={w} value={w}>{w}</option>)}
            </NativeSelect>
          </div>

          {jobsQ.loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Briefcase}
                title="No job listings found"
                description={searchQuery || selectedDept !== "all" || selectedWorkplace !== "all" ? "Try adjusting your filters." : "Post your first role to get started."}
                action={<Button asChild size="sm"><Link href="/admin/post-job"><PlusCircle className="mr-1.5 h-4 w-4" />Post a Job</Link></Button>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="hidden px-3 py-3 font-medium md:table-cell">Location</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">Type</th>
                    <th className="px-3 py-3 font-medium">Applicants</th>
                    <th className="hidden px-3 py-3 font-medium sm:table-cell">Posted</th>
                    <th className="w-12 px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="group transition-colors hover:bg-foreground/[0.02]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
                            <Briefcase className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <Link href={`/jobs/${job.id}`} target="_blank" className="block truncate font-medium hover:text-accent">
                              {job.title}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              <span className="font-mono">{job.id}</span> · {job.department || "General"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3.5 text-muted-foreground md:table-cell">
                        <span className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" />{job.workplace || "—"}</span>
                      </td>
                      <td className="hidden px-3 py-3.5 lg:table-cell">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{job.employmentType || "Full-time"}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{job.experienceLevel}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <Link href={`/admin/candidates?job=${job.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-accent">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="tabular-nums">{candCountByJob.get(job.id) || 0}</span>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-3.5 text-xs text-muted-foreground sm:table-cell">{timeAgo(job.created_at)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100" aria-label="Job actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleCopyLink(job.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/jobs/${job.id}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> View live</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/candidates?job=${job.id}`}><Users className="mr-2 h-4 w-4" /> Applicants</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-500 focus:text-rose-500" onClick={() => setJobToDelete(job)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <AlertDialog open={!!jobToDelete} onOpenChange={(o) => !o && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">&quot;{jobToDelete?.title}&quot;</span> ({jobToDelete?.id}) will be permanently
              removed. Candidates will no longer be able to view or apply for this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting…</> : "Delete job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
