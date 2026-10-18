"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Candidate, EmailLog, Job, Lead } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EMAIL_TEMPLATES, fillTemplate, loadSettings, timeAgo, useSupabaseTable } from "@/lib/admin-data";
import { EmptyState, InitialsAvatar, MissingTableNotice, NativeSelect, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Copy, Search, Inbox, Users, Target, AtSign, Sparkles, Eye, PenLine, Loader2 } from "lucide-react";

type RType = "candidate" | "lead" | "custom";

function EmailInner() {
  const { toast } = useToast();
  const params = useSearchParams();
  const { user, adminUser } = useAuth();
  const { data: candidates } = useSupabaseTable<Candidate>("candidates");
  const { data: leads } = useSupabaseTable<Lead>("leads");
  const { data: jobs } = useSupabaseTable<Job>("jobs");
  const logsQ = useSupabaseTable<EmailLog>("email_logs");

  const [rtype, setRtype] = useState<RType>("candidate");
  const [rid, setRid] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyQ, setHistoryQ] = useState("");
  const [openLog, setOpenLog] = useState<EmailLog | null>(null);
  const [settings, setSettings] = useState(loadSettings());

  useEffect(() => setSettings(loadSettings()), []);

  // Prefill from deep link
  useEffect(() => {
    const t = params.get("type") as RType | null;
    const id = params.get("id");
    if (t && id) {
      setRtype(t);
      setRid(id);
    }
  }, [params]);

  const senderName = settings.senderName || adminUser?.full_name || user?.email?.split("@")[0] || "Talento Team";

  const recipient = useMemo(() => {
    if (rtype === "candidate") {
      const c = candidates.find((x) => x.id === rid);
      if (!c) return null;
      return { name: c.full_name, email: c.email || "", job_title: jobs.find((j) => j.id === c.job_id)?.title || "the role", company: "" };
    }
    if (rtype === "lead") {
      const l = leads.find((x) => x.id === rid);
      if (!l) return null;
      return { name: l.name, email: l.email || "", job_title: "", company: l.company || "your company" };
    }
    return customEmail ? { name: customName, email: customEmail, job_title: "", company: "" } : null;
  }, [rtype, rid, candidates, leads, jobs, customEmail, customName]);

  const vars = {
    first_name: recipient?.name?.split(" ")[0] || "there",
    job_title: recipient?.job_title,
    company: recipient?.company,
    sender_name: senderName,
  };

  const finalSubject = fillTemplate(subject, vars);
  const finalBody = fillTemplate(body, vars) + (settings.signature ? `\n\n${settings.signature}` : "");

  const applyTemplate = (id: string) => {
    const t = EMAIL_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSubject(t.subject);
    setBody(t.body);
  };

  const templates = EMAIL_TEMPLATES.filter((t) => rtype === "custom" || t.audience === rtype || t.audience === "any");

  const send = async () => {
    if (!recipient?.email) return toast({ variant: "destructive", title: "Recipient has no email address" });
    if (!subject.trim() || !body.trim()) return toast({ variant: "destructive", title: "Subject and message are required" });
    setSending(true);
    try {
      window.open(
        `mailto:${encodeURIComponent(recipient.email)}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`,
        "_blank"
      );
      if (!logsQ.missing) {
        const { data, error } = await getSupabase()
          .from("email_logs")
          .insert([
            {
              recipient_email: recipient.email,
              recipient_name: recipient.name || null,
              recipient_type: rtype,
              recipient_id: rtype === "custom" ? null : rid,
              subject: finalSubject,
              body: finalBody,
              template: templateId,
              status: "sent",
            },
          ])
          .select()
          .single();
        if (error) throw error;
        logsQ.setData((p) => [data as EmailLog, ...p]);
      }
      toast({ title: "Email opened in your mail app", description: "Saved to history." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not log email", description: err.message });
    } finally {
      setSending(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${finalSubject}\n\n${finalBody}`);
    toast({ title: "Copied to clipboard" });
  };

  const logs = logsQ.data.filter((l) => {
    const s = historyQ.toLowerCase();
    return !s || l.subject.toLowerCase().includes(s) || l.recipient_email.toLowerCase().includes(s) || l.recipient_name?.toLowerCase().includes(s);
  });

  const recipientOptions = rtype === "candidate" ? candidates : rtype === "lead" ? leads : [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Communication" title="Email" description="Compose personalised emails to candidates and leads using templates. Every send is logged." />

      {logsQ.missing && <div className="mb-6"><MissingTableNotice table="email_logs" /></div>}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Compose */}
        <Panel
          className="lg:col-span-3"
          title="Compose"
          action={
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
              {([["write", PenLine, "Write"], ["preview", Eye, "Preview"]] as const).map(([k, Icon, label]) => (
                <button
                  key={k}
                  onClick={() => setPreview(k === "preview")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    preview === (k === "preview") ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
          }
        >
          <div className="space-y-4">
            {/* Recipient type */}
            <div className="grid grid-cols-3 gap-2">
              {([
                ["candidate", Users, "Candidate"],
                ["lead", Target, "Lead"],
                ["custom", AtSign, "Custom"],
              ] as const).map(([k, Icon, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setRtype(k);
                    setRid("");
                    setTemplateId(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all",
                    rtype === k ? "border-accent/50 bg-accent/[0.06] text-foreground" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", rtype === k && "text-accent")} />{label}
                </button>
              ))}
            </div>

            {/* Recipient */}
            {rtype === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="to-email">To (email)</Label>
                  <Input id="to-email" type="email" value={customEmail} onChange={(e) => setCustomEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to-name">Name</Label>
                  <Input id="to-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="to-select">To</Label>
                <NativeSelect id="to-select" value={rid} onChange={(e) => setRid(e.target.value)} className="h-10">
                  <option value="">Select a {rtype}…</option>
                  {recipientOptions.map((r: any) => (
                    <option key={r.id} value={r.id} disabled={!r.email}>
                      {(r.full_name || r.name) + (r.email ? ` — ${r.email}` : " (no email)")}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            {/* Templates */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" />Templates</Label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-all",
                      templateId === t.id ? "border-accent bg-accent text-accent-foreground" : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {preview ? (
              <div className="rounded-xl border border-border/60 bg-background">
                <div className="space-y-1 border-b border-border/60 px-4 py-3 text-xs">
                  <p><span className="text-muted-foreground">To:</span> {recipient ? `${recipient.name || ""} <${recipient.email}>` : "—"}</p>
                  <p><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{finalSubject || "—"}</span></p>
                </div>
                <pre className="min-h-[240px] whitespace-pre-wrap px-4 py-4 font-body text-sm leading-relaxed">{finalBody}</pre>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="body">Message</Label>
                  <Textarea id="body" rows={11} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className="resize-y leading-relaxed" />
                  <p className="text-[11px] text-muted-foreground">
                    Variables: <code>{"{{first_name}}"}</code> <code>{"{{job_title}}"}</code> <code>{"{{company}}"}</code> <code>{"{{sender_name}}"}</code>. Your signature is appended automatically.
                  </p>
                </div>
              </>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={copy} disabled={!subject && !body}><Copy className="mr-1.5 h-4 w-4" />Copy</Button>
              <Button onClick={send} disabled={sending || !recipient?.email} id="send-email" className="bg-accent text-accent-foreground hover:bg-accent/90">
                {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                Send email
              </Button>
            </div>
          </div>
        </Panel>

        {/* History */}
        <Panel className="lg:col-span-2" title="Sent history" description={`${logsQ.data.length} emails`} bodyClassName="px-0 pb-2">
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={historyQ} onChange={(e) => setHistoryQ(e.target.value)} placeholder="Search history…" className="h-9 rounded-lg pl-9" />
            </div>
          </div>
          {logsQ.loading ? (
            <div className="space-y-2 px-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : logs.length === 0 ? (
            <div className="px-5"><EmptyState icon={Inbox} title="No emails yet" description="Emails you send will appear here." /></div>
          ) : (
            <ul className="max-h-[640px] divide-y divide-border/50 overflow-y-auto">
              {logs.map((l) => (
                <li key={l.id}>
                  <button onClick={() => setOpenLog(l)} className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-foreground/[0.03]">
                    <InitialsAvatar name={l.recipient_name || l.recipient_email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{l.recipient_name || l.recipient_email}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(l.created_at)}</span>
                      </div>
                      <p className="truncate text-xs">{l.subject}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{l.body.split("\n").find(Boolean)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Dialog open={!!openLog} onOpenChange={(o) => !o && setOpenLog(null)}>
        <DialogContent className="rounded-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6">{openLog?.subject}</DialogTitle>
            <DialogDescription>
              To {openLog?.recipient_name} &lt;{openLog?.recipient_email}&gt; · {openLog && new Date(openLog.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 font-body text-sm leading-relaxed">{openLog?.body}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense fallback={null}>
      <EmailInner />
    </Suspense>
  );
}
