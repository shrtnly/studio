"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Lead, LeadStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { LEAD_SOURCES, LEAD_STATUSES, leadMeta, timeAgo, useSupabaseTable } from "@/lib/admin-data";
import {
  EmptyState,
  FilterPills,
  InitialsAvatar,
  MissingTableNotice,
  NativeSelect,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Pencil,
  Trash2,
  Loader2,
  TrendingUp,
  Trophy,
  Wallet,
  Building2,
  Download,
} from "lucide-react";

type Filter = "all" | LeadStatus;

const EMPTY_LEAD: Partial<Lead> = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "Website",
  status: "new",
  value: null,
  notes: "",
};

function LeadsInner() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const { data: leads, setData, loading, missing, refresh } = useSupabaseTable<Lead>("leads");

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Lead> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing({ ...EMPTY_LEAD });
      router.replace("/admin/leads");
    }
  }, [params, router]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: leads.length };
    LEAD_STATUSES.forEach((s) => (m[s.value] = leads.filter((l) => l.status === s.value).length));
    return m;
  }, [leads]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return leads.filter(
      (l) =>
        (filter === "all" || l.status === filter) &&
        (!s ||
          l.name.toLowerCase().includes(s) ||
          l.company?.toLowerCase().includes(s) ||
          l.email?.toLowerCase().includes(s))
    );
  }, [leads, filter, q]);

  const pipelineValue = leads.filter((l) => l.status !== "lost").reduce((s, l) => s + (Number(l.value) || 0), 0);
  const closed = counts.won + counts.lost;
  const winRate = closed ? Math.round((counts.won / closed) * 100) : 0;

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        email: editing.email?.trim() || null,
        phone: editing.phone?.trim() || null,
        company: editing.company?.trim() || null,
        source: editing.source || null,
        status: editing.status || "new",
        value: editing.value === null || editing.value === undefined || (editing.value as any) === "" ? null : Number(editing.value),
        notes: editing.notes?.trim() || null,
      };
      const sb = getSupabase();
      if (editing.id) {
        const { data, error } = await sb.from("leads").update(payload).eq("id", editing.id).select().single();
        if (error) throw error;
        setData((prev) => prev.map((l) => (l.id === editing.id ? (data as Lead) : l)));
        toast({ title: "Lead updated" });
      } else {
        const { data, error } = await sb.from("leads").insert([payload]).select().single();
        if (error) throw error;
        setData((prev) => [data as Lead, ...prev]);
        toast({ title: "Lead added", description: payload.name });
      }
      setEditing(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not save lead", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    const prev = leads;
    setData((p) => p.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    const { error } = await getSupabase().from("leads").update({ status }).eq("id", lead.id);
    if (error) {
      setData(prev);
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    }
  };

  const remove = async (lead: Lead) => {
    if (!confirm(`Delete lead "${lead.name}"?`)) return;
    const { error } = await getSupabase().from("leads").delete().eq("id", lead.id);
    if (error) return toast({ variant: "destructive", title: "Delete failed", description: error.message });
    setData((p) => p.filter((l) => l.id !== lead.id));
    toast({ title: "Lead deleted" });
  };

  const exportCsv = () => {
    const header = ["Name", "Company", "Email", "Phone", "Status", "Source", "Value", "Created"];
    const rows = filtered.map((l) => [l.name, l.company, l.email, l.phone, l.status, l.source, l.value, l.created_at]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "talento-leads.csv";
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Business"
        title="Leads"
        description="Track prospective clients and hiring partners from first touch to closed deal."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" id="add-lead" onClick={() => setEditing({ ...EMPTY_LEAD })} disabled={missing}>
              <Plus className="mr-1.5 h-4 w-4" /> Add lead
            </Button>
          </>
        }
      />

      {missing && <div className="mb-6"><MissingTableNotice table="leads" /></div>}

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total leads" value={leads.length} icon={Target} tone="primary" hint={`${counts.new} new`} />
        <StatCard label="In progress" value={counts.contacted + counts.qualified + counts.proposal} icon={TrendingUp} tone="violet" hint="Contacted → Proposal" />
        <StatCard label="Pipeline value" value={`৳${pipelineValue >= 100000 ? (pipelineValue / 100000).toFixed(1) + "L" : pipelineValue.toLocaleString()}`} icon={Wallet} tone="accent" hint="Excludes lost deals" />
        <StatCard label="Win rate" value={`${winRate}%`} icon={Trophy} tone="emerald" hint={`${counts.won} won · ${counts.lost} lost`} />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: "All", count: counts.all }, ...LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] }))]}
          />
          <div className="relative lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="leads-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, email…" className="h-9 rounded-lg pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Target}
              title={leads.length ? "No leads match your filters" : "No leads yet"}
              description={leads.length ? "Try a different status or search term." : "Add your first lead to start building your pipeline."}
              action={!missing && !leads.length ? <Button size="sm" onClick={() => setEditing({ ...EMPTY_LEAD })}><Plus className="mr-1.5 h-4 w-4" />Add lead</Button> : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Company</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">Source</th>
                  <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Value</th>
                  <th className="hidden px-3 py-3 font-medium xl:table-cell">Added</th>
                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((l) => {
                  const m = leadMeta(l.status);
                  return (
                    <tr key={l.id} className="group cursor-pointer transition-colors hover:bg-foreground/[0.02]" onClick={() => setEditing(l)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={l.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{l.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{l.email || l.phone || "No contact info"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{l.company || "—"}</span>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset transition-opacity hover:opacity-80 ${m.chip}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            {LEAD_STATUSES.map((s) => (
                              <DropdownMenuItem key={s.value} onClick={() => updateStatus(l, s.value)}>
                                <span className={`mr-2 h-2 w-2 rounded-full ${s.dot}`} />{s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="hidden px-3 py-3 text-xs text-muted-foreground lg:table-cell">{l.source || "—"}</td>
                      <td className="hidden px-3 py-3 text-right text-xs font-medium tabular-nums sm:table-cell">{l.value ? `৳${Number(l.value).toLocaleString()}` : "—"}</td>
                      <td className="hidden px-3 py-3 text-xs text-muted-foreground xl:table-cell">{timeAgo(l.created_at)}</td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100" aria-label="Lead actions"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setEditing(l)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            {l.email && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/email?type=lead&id=${l.id}`}><Mail className="mr-2 h-4 w-4" />Send email</Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-500 focus:text-rose-500" onClick={() => remove(l)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit lead" : "New lead"}</DialogTitle>
            <DialogDescription>Business contacts, prospective clients and partners.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-1 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lead-name">Name *</Label>
                <Input id="lead-name" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Jane Cooper" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="jane@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input id="lead-phone" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="+880 1…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-company">Company</Label>
                <Input id="lead-company" value={editing.company || ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} placeholder="Acme Inc." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-value">Deal value (BDT)</Label>
                <Input id="lead-value" type="number" value={editing.value ?? ""} onChange={(e) => setEditing({ ...editing, value: e.target.value as any })} placeholder="250000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-status">Status</Label>
                <NativeSelect id="lead-status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as LeadStatus })}>
                  {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-source">Source</Label>
                <NativeSelect id="lead-source" value={editing.source || ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })}>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lead-notes">Notes</Label>
                <Textarea id="lead-notes" rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Context, next steps, requirements…" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} id="save-lead">
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editing?.id ? "Save changes" : "Create lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsInner />
    </Suspense>
  );
}
