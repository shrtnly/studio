"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Candidate, CandidateStage, Job } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CANDIDATE_SOURCES, CANDIDATE_STAGES, stageMeta, timeAgo, useSupabaseTable } from "@/lib/admin-data";
import {
  EmptyState,
  InitialsAvatar,
  MissingTableNotice,
  NativeSelect,
  PageHeader,
  Panel,
  StatusChip,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Users,
  Plus,
  Search,
  LayoutGrid,
  List,
  Star,
  Mail,
  Phone,
  Linkedin,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  Briefcase,
  Clock,
  Check,
  X,
} from "lucide-react";

type View = "board" | "list";

const EMPTY: Partial<Candidate> = {
  full_name: "",
  email: "",
  phone: "",
  job_id: null,
  stage: "applied",
  rating: 0,
  resume_url: "",
  linkedin_url: "",
  experience_years: null,
  expected_salary: "",
  source: "Careers Page",
  notes: "",
};

function Stars({ value, onChange, size = "sm" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const [hover, setHover] = useState(0);
  const s = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onMouseEnter={() => onChange && setHover(n)}
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(n === value ? 0 : n);
          }}
          className={cn("transition-transform", onChange && "hover:scale-110")}
          aria-label={`${n} star`}
        >
          <Star className={cn(s, (hover || value) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}

function CandidatesInner() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const { data: candidates, setData, loading, missing } = useSupabaseTable<Candidate>("candidates");
  const { data: jobs } = useSupabaseTable<Job>("jobs");

  const [view, setView] = useState<View>("board");
  const [q, setQ] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState<"all" | CandidateStage>("all");
  const [editing, setEditing] = useState<Partial<Candidate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<CandidateStage | null>(null);

  // Deep-link params
  useEffect(() => {
    const job = params.get("job");
    const stage = params.get("stage") as CandidateStage | null;
    const id = params.get("id");
    if (job) setJobFilter(job);
    if (stage) {
      setStageFilter(stage);
      setView("list");
    }
    if (id) setSelectedId(id);
    if (params.get("new") === "1") {
      setEditing({ ...EMPTY, job_id: job || null });
      router.replace("/admin/candidates");
    }
  }, [params, router]);

  const jobTitle = (id: string | null) => jobs.find((j) => j.id === id)?.title;

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return candidates.filter(
      (c) =>
        (jobFilter === "all" || c.job_id === jobFilter) &&
        (stageFilter === "all" || c.stage === stageFilter) &&
        (!s || c.full_name.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s))
    );
  }, [candidates, q, jobFilter, stageFilter]);

  const selected = candidates.find((c) => c.id === selectedId) || null;

  /* ----------------------------- mutations ----------------------------- */
  const patch = async (id: string, changes: Partial<Candidate>, okMsg?: string) => {
    const prev = candidates;
    setData((p) => p.map((c) => (c.id === id ? { ...c, ...changes, updated_at: new Date().toISOString() } : c)));
    const { error } = await getSupabase().from("candidates").update(changes).eq("id", id);
    if (error) {
      setData(prev);
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else if (okMsg) {
      toast({ title: okMsg });
    }
  };

  const moveStage = (c: Candidate, stage: CandidateStage) => {
    if (c.stage === stage) return;
    patch(c.id, { stage }, `${c.full_name} → ${stageMeta(stage).label}`);
  };

  const save = async () => {
    if (!editing?.full_name?.trim()) {
      toast({ variant: "destructive", title: "Full name is required" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: editing.full_name.trim(),
        email: editing.email?.trim() || null,
        phone: editing.phone?.trim() || null,
        job_id: editing.job_id || null,
        stage: editing.stage || "applied",
        rating: editing.rating || 0,
        resume_url: editing.resume_url?.trim() || null,
        linkedin_url: editing.linkedin_url?.trim() || null,
        experience_years:
          editing.experience_years === null || editing.experience_years === undefined || (editing.experience_years as any) === ""
            ? null
            : Number(editing.experience_years),
        expected_salary: editing.expected_salary?.trim() || null,
        source: editing.source || null,
        notes: editing.notes?.trim() || null,
      };
      const sb = getSupabase();
      if (editing.id) {
        const { data, error } = await sb.from("candidates").update(payload).eq("id", editing.id).select().single();
        if (error) throw error;
        setData((p) => p.map((c) => (c.id === editing.id ? (data as Candidate) : c)));
        toast({ title: "Candidate updated" });
      } else {
        const { data, error } = await sb.from("candidates").insert([payload]).select().single();
        if (error) throw error;
        setData((p) => [data as Candidate, ...p]);
        toast({ title: "Candidate added", description: payload.full_name });
      }
      setEditing(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not save candidate", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Candidate) => {
    if (!confirm(`Delete candidate "${c.full_name}"? This cannot be undone.`)) return;
    const { error } = await getSupabase().from("candidates").delete().eq("id", c.id);
    if (error) return toast({ variant: "destructive", title: "Delete failed", description: error.message });
    setData((p) => p.filter((x) => x.id !== c.id));
    setSelectedId(null);
    toast({ title: "Candidate deleted" });
  };

  /* ------------------------------- render ------------------------------ */
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Hiring"
        title="Candidates"
        description="Move applicants through your pipeline. Drag cards between stages to update them."
        actions={
          <Button size="sm" id="add-candidate" onClick={() => setEditing({ ...EMPTY, job_id: jobFilter !== "all" ? jobFilter : null })} disabled={missing}>
            <Plus className="mr-1.5 h-4 w-4" /> Add candidate
          </Button>
        }
      />

      {missing && <div className="mb-6"><MissingTableNotice table="candidates" /></div>}

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="candidates-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates…" className="h-9 rounded-lg pl-9" />
        </div>
        <NativeSelect value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="sm:w-60">
          <option value="all">All jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </NativeSelect>
        {view === "list" && (
          <NativeSelect value={stageFilter} onChange={(e) => setStageFilter(e.target.value as any)} className="sm:w-40">
            <option value="all">All stages</option>
            {CANDIDATE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </NativeSelect>
        )}
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 sm:ml-auto">
          {([
            ["board", LayoutGrid, "Board"],
            ["list", List, "List"],
          ] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                if (v === "board") setStageFilter("all");
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : view === "board" ? (
        /* ------------------------------ Board ------------------------------ */
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="grid min-w-[1100px] grid-cols-6 gap-3">
            {CANDIDATE_STAGES.map((stage) => {
              const items = filtered.filter((c) => c.stage === stage.value);
              return (
                <div
                  key={stage.value}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(stage.value);
                  }}
                  onDragLeave={() => setDragOver((s) => (s === stage.value ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const c = candidates.find((x) => x.id === dragId);
                    if (c) moveStage(c, stage.value);
                    setDragId(null);
                    setDragOver(null);
                  }}
                  className={cn(
                    "flex min-h-[420px] flex-col rounded-xl border border-border/60 bg-muted/25 transition-colors",
                    dragOver === stage.value && "border-accent/50 bg-accent/[0.05]"
                  )}
                >
                  <div className="flex items-center justify-between px-3 py-3">
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                      {stage.label}
                    </span>
                    <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="flex-1 space-y-2 px-2 pb-2">
                    {items.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOver(null);
                        }}
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "group cursor-grab rounded-lg border border-border/60 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md active:cursor-grabbing",
                          dragId === c.id && "rotate-1 opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <InitialsAvatar name={c.full_name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium leading-tight">{c.full_name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{jobTitle(c.job_id) || "General"}</p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <Stars value={c.rating || 0} />
                          <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground/70">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ------------------------------ List ------------------------------- */
        <Panel bodyClassName="p-0">
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Users} title="No candidates found" description="Adjust filters or add a new candidate." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Candidate</th>
                    <th className="hidden px-3 py-3 font-medium md:table-cell">Applied for</th>
                    <th className="px-3 py-3 font-medium">Stage</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">Rating</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">Source</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((c) => {
                    const m = stageMeta(c.stage);
                    return (
                      <tr key={c.id} onClick={() => setSelectedId(c.id)} className="cursor-pointer transition-colors hover:bg-foreground/[0.02]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={c.full_name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{c.full_name}</p>
                              <p className="truncate text-xs text-muted-foreground">{c.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 text-xs text-muted-foreground md:table-cell">{jobTitle(c.job_id) || "General"}</td>
                        <td className="px-3 py-3"><StatusChip label={m.label} chip={m.chip} dot={m.dot} /></td>
                        <td className="hidden px-3 py-3 lg:table-cell"><Stars value={c.rating || 0} /></td>
                        <td className="hidden px-3 py-3 text-xs text-muted-foreground lg:table-cell">{c.source || "—"}</td>
                        <td className="hidden px-5 py-3 text-xs text-muted-foreground sm:table-cell">{timeAgo(c.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ---------------------------- Detail sheet ---------------------------- */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
          {selected && (
            <div className="flex min-h-full flex-col">
              <div className="border-b border-border/60 p-6">
                <SheetTitle className="sr-only">{selected.full_name}</SheetTitle>
                <div className="flex items-center gap-4">
                  <InitialsAvatar name={selected.full_name} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold font-headline">{selected.full_name}</h2>
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" />{jobTitle(selected.job_id) || "General application"}
                    </p>
                    <div className="mt-2"><Stars size="md" value={selected.rating || 0} onChange={(v) => patch(selected.id, { rating: v })} /></div>
                  </div>
                </div>
              </div>

              {/* Stage stepper */}
              <div className="border-b border-border/60 p-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stage</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CANDIDATE_STAGES.map((s) => {
                    const active = selected.stage === s.value;
                    return (
                      <button
                        key={s.value}
                        onClick={() => moveStage(selected, s.value)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                          active ? `${s.chip} border-transparent ring-1 ring-inset` : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {active ? (s.value === "rejected" ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />) : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 space-y-5 p-6 text-sm">
                <div className="space-y-2.5">
                  {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-2.5 hover:text-accent"><Mail className="h-4 w-4 text-muted-foreground" />{selected.email}</a>}
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-2.5 hover:text-accent"><Phone className="h-4 w-4 text-muted-foreground" />{selected.phone}</a>}
                  {selected.linkedin_url && <a href={selected.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-accent"><Linkedin className="h-4 w-4 text-muted-foreground" />LinkedIn profile</a>}
                  {selected.resume_url && <a href={selected.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-accent"><FileText className="h-4 w-4 text-muted-foreground" />Resume / CV</a>}
                  <p className="flex items-center gap-2.5 text-muted-foreground"><Clock className="h-4 w-4" />Applied {timeAgo(selected.created_at)}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Experience", selected.experience_years != null ? `${selected.experience_years} yrs` : "—"],
                    ["Expected", selected.expected_salary || "—"],
                    ["Source", selected.source || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border/60 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                      <p className="mt-1 truncate text-xs font-medium" title={v}>{v}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{selected.notes || "No notes yet."}</p>
                </div>
              </div>

              <div className="sticky bottom-0 flex gap-2 border-t border-border/60 bg-background/95 p-4 backdrop-blur">
                {selected.email && (
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/admin/email?type=candidate&id=${selected.id}`}><Mail className="mr-1.5 h-4 w-4" />Email</Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(selected)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500" onClick={() => remove(selected)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* --------------------------- Create / edit ---------------------------- */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit candidate" : "New candidate"}</DialogTitle>
            <DialogDescription>Applicant details and pipeline placement.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-1 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-name">Full name *</Label>
                <Input id="c-name" value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} placeholder="Rahim Uddin" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-job">Applied for</Label>
                <NativeSelect id="c-job" value={editing.job_id || ""} onChange={(e) => setEditing({ ...editing, job_id: e.target.value || null })}>
                  <option value="">General application</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} ({j.id})</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-stage">Stage</Label>
                <NativeSelect id="c-stage" value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: e.target.value as CandidateStage })}>
                  {CANDIDATE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-source">Source</Label>
                <NativeSelect id="c-source" value={editing.source || ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })}>
                  {CANDIDATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-exp">Experience (years)</Label>
                <Input id="c-exp" type="number" step="0.5" value={editing.experience_years ?? ""} onChange={(e) => setEditing({ ...editing, experience_years: e.target.value as any })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-salary">Expected salary</Label>
                <Input id="c-salary" value={editing.expected_salary || ""} onChange={(e) => setEditing({ ...editing, expected_salary: e.target.value })} placeholder="BDT 100,000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-linkedin">LinkedIn URL</Label>
                <Input id="c-linkedin" value={editing.linkedin_url || ""} onChange={(e) => setEditing({ ...editing, linkedin_url: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-resume">Resume URL</Label>
                <Input id="c-resume" value={editing.resume_url || ""} onChange={(e) => setEditing({ ...editing, resume_url: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Rating</Label>
                <Stars size="md" value={editing.rating || 0} onChange={(v) => setEditing({ ...editing, rating: v })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-notes">Notes</Label>
                <Textarea id="c-notes" rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} id="save-candidate">
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editing?.id ? "Save changes" : "Add candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidatesInner />
    </Suspense>
  );
}
