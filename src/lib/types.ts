export interface Job {
    id: string;
    title: string;
    description: string;
    whatYouWillDo: string[];
    highlightedSkills: string[];
    otherSkills: string[];
    requiredSkills: string[];
    kpis: string[];
    workHours: string[];
    otherDuties: string;
    education: string;
    salary: string;
    salaryMin: number | null;
    salaryMax: number | null;
    experienceLevel: string;
    benefits: string[];
    hiringProcess: { title: string; details: string; }[];
    fullDescription: string;
    workplace: string;
    employmentType: string;
    department: string;
    created_at?: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export interface Lead {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    source: string | null;
    status: LeadStatus;
    value: number | null;
    notes: string | null;
    created_at: string;
    updated_at?: string;
}

export type CandidateStage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";

export interface Candidate {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    job_id: string | null;
    stage: CandidateStage;
    rating: number | null;
    resume_url: string | null;
    linkedin_url: string | null;
    experience_years: number | null;
    expected_salary: string | null;
    source: string | null;
    notes: string | null;
    created_at: string;
    updated_at?: string;
}

export interface EmailLog {
    id: string;
    recipient_email: string;
    recipient_name: string | null;
    recipient_type: "candidate" | "lead" | "custom" | null;
    recipient_id: string | null;
    subject: string;
    body: string;
    template: string | null;
    status: string;
    created_at: string;
}
