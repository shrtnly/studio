"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import JobPreviewCard from "@/components/admin/JobPreviewCard";
import { PageHeader } from "@/components/admin/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase,
  Building,
  DollarSign,
  GraduationCap,
  ListPlus,
  Plus,
  Trash2,
  Eye,
  Send,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Layers,
  CalendarCheck
} from "lucide-react";

const COMMON_DEPARTMENTS = [
  "Engineering",
  "Product Design",
  "Business Development",
  "Marketing & Communications",
  "Operations",
  "Human Resources",
  "Quality Assurance",
  "Data & AI",
];

const WORKPLACE_OPTIONS = [
  "Dhaka (Hybrid)",
  "Dhaka (Onsite)",
  "Remote (Worldwide)",
  "Remote (Bangladesh)",
  "Chittagong (Onsite)",
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const EXPERIENCE_LEVELS = ["Entry-level", "Mid-level", "Senior-level", "Lead", "Executive"];

export default function PostJobPage() {
  const router = useRouter();
  const { isApproved } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedJobId, setPublishedJobId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [customId, setCustomId] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [customDepartment, setCustomDepartment] = useState("");
  const [workplace, setWorkplace] = useState("Dhaka (Hybrid)");
  const [customWorkplace, setCustomWorkplace] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [experienceLevel, setExperienceLevel] = useState("Mid-level");
  const [salary, setSalary] = useState("BDT 80,000 - 120,000 (Monthly)");
  const [salaryMin, setSalaryMin] = useState<string>("80000");
  const [salaryMax, setSalaryMax] = useState<string>("120000");
  const [education, setEducation] = useState("Bachelor's degree in Computer Science, Software Engineering or related field.");
  const [description, setDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [otherDuties, setOtherDuties] = useState("TALENTO uses modern productivity and AI collaboration tools to support high quality delivery.");

  // Arrays
  const [whatYouWillDo, setWhatYouWillDo] = useState<string[]>([
    "Collaborate with cross-functional teams to design, build, and ship high quality software.",
    "Participate in architecture discussions, code reviews, and sprint planning.",
  ]);
  const [highlightedSkillsInput, setHighlightedSkillsInput] = useState("React, TypeScript, Next.js, Node.js");
  const [otherSkillsInput, setOtherSkillsInput] = useState("TailwindCSS, Git, Docker, REST APIs");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([
    "3+ years of professional software development experience.",
    "Strong proficiency in modern JavaScript/TypeScript and web frameworks.",
  ]);
  const [kpis, setKpis] = useState<string[]>([
    "On-time feature delivery and sprint objective completion.",
    "Code quality, test coverage, and adherence to engineering best practices.",
  ]);
  const [workHours, setWorkHours] = useState<string[]>([
    "Working Days: Monday to Friday (5 working days per week).",
    "Working Hours: 10:00 AM to 7:00 PM (with lunch break).",
  ]);
  const [benefits, setBenefits] = useState<string[]>([
    "Competitive salary with bi-annual performance reviews",
    "Festival bonuses (2 per year)",
    "Subsidized lunch facilities & snacks",
    "Health and medical coverage support",
  ]);
  const [hiringProcess, setHiringProcess] = useState<{ title: string; details: string }[]>([
    { title: "Application Screening", details: "Review of portfolio, experience, and profile alignment." },
    { title: "Technical Discussion", details: "Technical deep-dive and problem-solving assessment." },
    { title: "Culture & Team Fit", details: "Final discussion with team lead and department head." },
  ]);

  // Array item helpers
  const handleAddStringItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""]);
  };

  const handleUpdateStringItem = (
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleRemoveStringItem = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  // Hiring process helpers
  const handleAddHiringStep = () => {
    setHiringProcess((prev) => [...prev, { title: "", details: "" }]);
  };

  const handleUpdateHiringStep = (index: number, field: "title" | "details", value: string) => {
    setHiringProcess((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveHiringStep = (index: number) => {
    setHiringProcess((prev) => prev.filter((_, i) => i !== index));
  };

  // Compile job object
  const buildJobObject = (): Partial<Job> => {
    const finalDepartment = department === "Other" ? customDepartment.trim() || "General" : department;
    const finalWorkplace = workplace === "Other" ? customWorkplace.trim() || "Dhaka (Hybrid)" : workplace;

    const parsedHighlighted = highlightedSkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedOtherSkills = otherSkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      id: customId.trim() || undefined,
      title: title.trim(),
      department: finalDepartment,
      workplace: finalWorkplace,
      employmentType,
      experienceLevel,
      salary: salary.trim(),
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
      salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
      education: education.trim(),
      description: description.trim(),
      fullDescription: fullDescription.trim() || description.trim(),
      whatYouWillDo: whatYouWillDo.map((s) => s.trim()).filter(Boolean),
      highlightedSkills: parsedHighlighted,
      otherSkills: parsedOtherSkills,
      requiredSkills: requiredSkills.map((s) => s.trim()).filter(Boolean),
      kpis: kpis.map((s) => s.trim()).filter(Boolean),
      workHours: workHours.map((s) => s.trim()).filter(Boolean),
      benefits: benefits.map((s) => s.trim()).filter(Boolean),
      hiringProcess: hiringProcess
        .filter((s) => s.title.trim())
        .map((s) => ({ title: s.title.trim(), details: s.details.trim() })),
      otherDuties: otherDuties.trim(),
    };
  };

  // Publish to Supabase
  const handlePublish = async () => {
    if (!isApproved) {
      toast({
        variant: "destructive",
        title: "Access Restricted",
        description: "Your administrator account has not been approved in Supabase yet. Please contact an admin.",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Job Title is required",
        description: "Please enter a title for the job posting.",
      });
      setActiveTab("edit");
      return;
    }

    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: "Job Summary is required",
        description: "Please provide a short overview/description for candidates.",
      });
      setActiveTab("edit");
      return;
    }

    setIsPublishing(true);

    try {
      const supabase = getSupabase();
      const jobData = buildJobObject();

      // Generate unique ID if not provided (e.g., ta + 4 digits)
      const generatedId = jobData.id || `ta${Math.floor(1000 + Math.random() * 9000)}`;

      const payload = {
        ...jobData,
        id: generatedId,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("jobs").insert([payload]).select().single();

      if (error) {
        throw error;
      }

      setPublishedJobId(generatedId);
      toast({
        title: "Job Published Successfully! 🎉",
        description: `Position "${payload.title}" (ID: ${generatedId}) is now live.`,
      });
    } catch (err: any) {
      console.error("Error publishing job:", err);
      toast({
        variant: "destructive",
        title: "Failed to publish job",
        description: err.message || "An error occurred while saving to the database. Please try again.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Success Screen
  if (publishedJobId) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <Card className="p-8 shadow-xl border-primary/20 bg-card/90 backdrop-blur">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline mb-2">Job Successfully Published!</CardTitle>
          <CardDescription className="text-base text-muted-foreground mb-6">
            The job listing is now live in the careers directory with Job ID:{" "}
            <span className="font-mono text-primary font-semibold">{publishedJobId}</span>
          </CardDescription>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
              <Link href={`/jobs/${publishedJobId}`} target="_blank">
                <Eye className="w-4 h-4 mr-2" />
                View Live Job Page
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/admin">
                <Layers className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setPublishedJobId(null);
                setTitle("");
                setDescription("");
                setFullDescription("");
                setActiveTab("edit");
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post Another Job
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentPreviewJob = buildJobObject();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Hiring"
        title="Create & Publish Job"
        description="Complete the details below, preview the live candidate experience, and publish to the database."
        actions={
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
              <TabsList className="bg-muted/80">
                <TabsTrigger value="edit" className="text-xs sm:text-sm">
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  Edit Form
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs sm:text-sm">
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Preview Mode
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish Job
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Mode View: Preview or Form */}
      {activeTab === "preview" ? (
        <JobPreviewCard
          job={currentPreviewJob}
          onBackToEdit={() => setActiveTab("edit")}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      ) : (
        <div className="space-y-8">
          {/* Section 1: Basic Information */}
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Briefcase className="w-5 h-5" />
                <CardTitle className="text-lg">Role & Department</CardTitle>
              </div>
              <CardDescription>Primary job title, department categorization, and location settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Job Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. Senior Full Stack Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customId" className="text-sm font-medium">
                    Job ID <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="customId"
                    placeholder="e.g. ta1580 (auto if empty)"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    className="h-11 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">
                    Department
                  </Label>
                  <select
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-11 px-3 rounded-md bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {COMMON_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="Other">Custom Department...</option>
                  </select>
                  {department === "Other" && (
                    <Input
                      placeholder="Enter custom department"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workplace" className="text-sm font-medium">
                    Workplace & Location
                  </Label>
                  <select
                    id="workplace"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    className="w-full h-11 px-3 rounded-md bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {WORKPLACE_OPTIONS.map((wp) => (
                      <option key={wp} value={wp}>
                        {wp}
                      </option>
                    ))}
                    <option value="Other">Custom Workplace...</option>
                  </select>
                  {workplace === "Other" && (
                    <Input
                      placeholder="e.g. London (Remote)"
                      value={customWorkplace}
                      onChange={(e) => setCustomWorkplace(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employmentType" className="text-sm font-medium">
                    Employment Type
                  </Label>
                  <select
                    id="employmentType"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full h-11 px-3 rounded-md bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {EMPLOYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Compensation & Level */}
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <DollarSign className="w-5 h-5" />
                <CardTitle className="text-lg">Compensation & Seniority</CardTitle>
              </div>
              <CardDescription>Salary ranges, experience expectations, and education.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="salary" className="text-sm font-medium">
                    Salary Display String
                  </Label>
                  <Input
                    id="salary"
                    placeholder="e.g. BDT 80,000 - 120,000 (Monthly)"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryMin" className="text-sm font-medium">
                    Salary Min <span className="text-xs text-muted-foreground font-normal">(Number)</span>
                  </Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    placeholder="80000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryMax" className="text-sm font-medium">
                    Salary Max <span className="text-xs text-muted-foreground font-normal">(Number)</span>
                  </Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    placeholder="120000"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel" className="text-sm font-medium">
                    Experience Level
                  </Label>
                  <select
                    id="experienceLevel"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full h-11 px-3 rounded-md bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education" className="text-sm font-medium">
                    Education Requirements
                  </Label>
                  <Input
                    id="education"
                    placeholder="e.g. Bachelor's in CS or equivalent"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Job Description & Overview */}
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Sparkles className="w-5 h-5" />
                <CardTitle className="text-lg">Role Descriptions</CardTitle>
              </div>
              <CardDescription>Short teaser overview for listings, plus full detailed posting description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Short Overview / Teaser <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="A concise 2-3 sentence overview of this role and why it matters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullDescription" className="text-sm font-medium">
                  Detailed Description <span className="text-xs text-muted-foreground font-normal">(Optional, defaults to overview if empty)</span>
                </Label>
                <Textarea
                  id="fullDescription"
                  rows={4}
                  placeholder="Complete comprehensive job description, team context, client background..."
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otherDuties" className="text-sm font-medium">
                  Other Duties / AI & Workplace Notice
                </Label>
                <Input
                  id="otherDuties"
                  placeholder="e.g. We encourage the responsible use of modern AI productivity tools..."
                  value={otherDuties}
                  onChange={(e) => setOtherDuties(e.target.value)}
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Skills & Tags */}
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Layers className="w-5 h-5" />
                <CardTitle className="text-lg">Skill Sets & Tags</CardTitle>
              </div>
              <CardDescription>Comma-separated skill badges displayed prominently at the top of the job post.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="highlightedSkills" className="text-sm font-medium">
                  Highlighted Primary Skills <span className="text-xs text-muted-foreground font-normal">(Comma separated)</span>
                </Label>
                <Input
                  id="highlightedSkills"
                  placeholder="React, TypeScript, Next.js, Node.js"
                  value={highlightedSkillsInput}
                  onChange={(e) => setHighlightedSkillsInput(e.target.value)}
                  className="h-11"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {highlightedSkillsInput
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((skill) => (
                      <Badge key={skill} variant="default" className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {skill}
                      </Badge>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otherSkills" className="text-sm font-medium">
                  Secondary / Bonus Skills <span className="text-xs text-muted-foreground font-normal">(Comma separated)</span>
                </Label>
                <Input
                  id="otherSkills"
                  placeholder="Docker, CI/CD, GraphQL, TailwindCSS"
                  value={otherSkillsInput}
                  onChange={(e) => setOtherSkillsInput(e.target.value)}
                  className="h-11"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {otherSkillsInput
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: What you will do (Responsibilities) */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">What You Will Do (Responsibilities)</CardTitle>
                <CardDescription>Key day-to-day responsibilities and deliverable items.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddStringItem(setWhatYouWillDo)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Responsibility
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {whatYouWillDo.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => handleUpdateStringItem(idx, e.target.value, setWhatYouWillDo)}
                    placeholder={`Responsibility #${idx + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStringItem(idx, setWhatYouWillDo)}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 6: Required Qualifications */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Required Qualifications & Experience</CardTitle>
                <CardDescription>Must-have technical competencies, track record, and capabilities.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddStringItem(setRequiredSkills)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Requirement
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {requiredSkills.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => handleUpdateStringItem(idx, e.target.value, setRequiredSkills)}
                    placeholder={`Requirement #${idx + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStringItem(idx, setRequiredSkills)}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 7: Key Performance Indicators & Work Hours */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Key Performance Indicators</CardTitle>
                  <CardDescription className="text-xs">KPIs and success metrics</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddStringItem(setKpis)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {kpis.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => handleUpdateStringItem(idx, e.target.value, setKpis)}
                      placeholder={`KPI #${idx + 1}`}
                      className="text-xs sm:text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStringItem(idx, setKpis)}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0 h-9 w-9"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Work Hours & Schedule</CardTitle>
                  <CardDescription className="text-xs">Days, shift timings, hybrid policy</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddStringItem(setWorkHours)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {workHours.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => handleUpdateStringItem(idx, e.target.value, setWorkHours)}
                      placeholder={`Schedule detail #${idx + 1}`}
                      className="text-xs sm:text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStringItem(idx, setWorkHours)}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0 h-9 w-9"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Section 8: Benefits */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Perks & Benefits</CardTitle>
                <CardDescription>Incentives, bonuses, insurance, meals, and facilities.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddStringItem(setBenefits)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Benefit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {benefits.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => handleUpdateStringItem(idx, e.target.value, setBenefits)}
                    placeholder={`Benefit #${idx + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStringItem(idx, setBenefits)}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 9: Hiring Process Steps */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Hiring Process Steps</CardTitle>
                <CardDescription>Step-by-step interview roadmap displayed to candidates.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddHiringStep}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {hiringProcess.map((step, idx) => (
                <div key={idx} className="p-3.5 rounded-lg border bg-muted/20 space-y-2 relative">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Step {idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveHiringStep(idx)}
                      className="text-muted-foreground hover:text-destructive h-7 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <Input
                    placeholder="Step Title (e.g. Technical Interview)"
                    value={step.title}
                    onChange={(e) => handleUpdateHiringStep(idx, "title", e.target.value)}
                    className="font-medium"
                  />
                  <Textarea
                    placeholder="Step details & what candidate should expect..."
                    rows={2}
                    value={step.details}
                    onChange={(e) => handleUpdateHiringStep(idx, "details", e.target.value)}
                    className="text-xs sm:text-sm"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setActiveTab("preview")}
              className="w-full sm:w-auto"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Job Listing
            </Button>

            <Button
              type="button"
              size="lg"
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish Job Now
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
