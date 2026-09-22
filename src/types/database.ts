// ─── TypeScript types for the Supabase PostgreSQL schema ─────────────────────
// Auto-generated shape matching our database schema.
// Run `npx supabase gen types typescript` to regenerate from your real schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────
export type UserRole = "candidate" | "recruiter" | "admin";
export type ParseStatus = "pending" | "processing" | "done" | "failed";
export type InterviewMode = "text" | "voice" | "video";
export type InterviewType = "behavioral" | "technical" | "mixed" | "hr";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq" | "coding" | "short_answer" | "aptitude";
export type RoadmapItemType = "course" | "project" | "certification" | "practice";
export type RoadmapItemStatus = "pending" | "in_progress" | "completed";
export type GapSeverity = "high" | "medium" | "low";
export type SkillImportance = "required" | "preferred";

// ─── Database Interface ───────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at">;
        Update: Partial<Omit<Organization, "id" | "created_at">>;
      };
      org_members: {
        Row: OrgMember;
        Insert: Omit<OrgMember, "id" | "joined_at">;
        Update: Partial<Omit<OrgMember, "id" | "joined_at">>;
      };
      resumes: {
        Row: Resume;
        Insert: Omit<Resume, "id" | "created_at">;
        Update: Partial<Omit<Resume, "id" | "created_at">>;
      };
      resume_parsed_data: {
        Row: ResumeParsedData;
        Insert: Omit<ResumeParsedData, "id">;
        Update: Partial<Omit<ResumeParsedData, "id">>;
      };
      job_roles: {
        Row: JobRole;
        Insert: Omit<JobRole, "id" | "created_at">;
        Update: Partial<Omit<JobRole, "id" | "created_at">>;
      };
      job_descriptions: {
        Row: JobDescription;
        Insert: Omit<JobDescription, "id" | "created_at">;
        Update: Partial<Omit<JobDescription, "id" | "created_at">>;
      };
      skills: {
        Row: Skill;
        Insert: Omit<Skill, "id">;
        Update: Partial<Omit<Skill, "id">>;
      };
      user_skill_profiles: {
        Row: UserSkillProfile;
        Insert: Omit<UserSkillProfile, "id" | "last_updated">;
        Update: Partial<Omit<UserSkillProfile, "id">>;
      };
      skill_gap_reports: {
        Row: SkillGapReport;
        Insert: Omit<SkillGapReport, "id" | "generated_at">;
        Update: Partial<Omit<SkillGapReport, "id" | "generated_at">>;
      };
      question_bank: {
        Row: Question;
        Insert: Omit<Question, "id" | "created_at">;
        Update: Partial<Omit<Question, "id" | "created_at">>;
      };
      test_sessions: {
        Row: TestSession;
        Insert: Omit<TestSession, "id" | "started_at">;
        Update: Partial<Omit<TestSession, "id" | "started_at">>;
      };
      test_answers: {
        Row: TestAnswer;
        Insert: Omit<TestAnswer, "id" | "created_at">;
        Update: Partial<Omit<TestAnswer, "id" | "created_at">>;
      };
      interview_sessions: {
        Row: InterviewSession;
        Insert: Omit<InterviewSession, "id" | "started_at">;
        Update: Partial<Omit<InterviewSession, "id" | "started_at">>;
      };
      interview_qa: {
        Row: InterviewQA;
        Insert: Omit<InterviewQA, "id" | "created_at">;
        Update: Partial<Omit<InterviewQA, "id" | "created_at">>;
      };
      roadmap_items: {
        Row: RoadmapItem;
        Insert: Omit<RoadmapItem, "id" | "created_at">;
        Update: Partial<Omit<RoadmapItem, "id" | "created_at">>;
      };
      readiness_snapshots: {
        Row: ReadinessSnapshot;
        Insert: Omit<ReadinessSnapshot, "id" | "snapshot_at">;
        Update: Partial<Omit<ReadinessSnapshot, "id" | "snapshot_at">>;
      };
      recruiter_views: {
        Row: RecruiterView;
        Insert: Omit<RecruiterView, "id" | "viewed_at">;
        Update: Partial<Omit<RecruiterView, "id" | "viewed_at">>;
      };
      recruiter_templates: {
        Row: RecruiterTemplate;
        Insert: Omit<RecruiterTemplate, "id" | "created_at">;
        Update: Partial<Omit<RecruiterTemplate, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ─── Entity Types ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  target_role: string | null;
  experience_yrs: number;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at">;

export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  org_role: "owner" | "admin" | "member";
  joined_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_type: "pdf" | "docx";
  raw_text: string | null;
  parse_status: ParseStatus;
  parsed_at: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface ExtractedSkill {
  skill: string;
  category: string;
  confidence: number; // 0–1
  source: "experience" | "project" | "certification" | "explicit";
}

export interface ATSFeedbackItem {
  issue: string;
  severity: "critical" | "warning" | "info";
  suggestion: string;
}

export interface ResumeParsedData {
  id: string;
  resume_id: string;
  personal_info: Json | null;
  education: Json | null;
  experience: Json | null;
  projects: Json | null;
  certifications: Json | null;
  extracted_skills: ExtractedSkill[] | null;
  ats_score: number | null;
  ats_feedback: ATSFeedbackItem[] | null;
  embedding: number[] | null;
  parsed_at: string;
}

export interface JobRole {
  id: string;
  title: string;
  category: string | null;
  level: "junior" | "mid" | "senior" | "lead" | null;
  required_skills: Json | null;
  description: string | null;
  embedding: number[] | null;
  is_system: boolean;
  created_at: string;
}

export interface JobDescription {
  id: string;
  user_id: string;
  raw_text: string;
  parsed_role: string | null;
  parsed_skills: Json | null;
  embedding: number[] | null;
  job_role_id: string | null;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  aliases: string[] | null;
  embedding: number[] | null;
}

export interface UserSkillProfile {
  id: string;
  user_id: string;
  skill_id: string;
  confidence: number; // 0–1
  source_resume: number | null;
  source_tests: number | null;
  source_interview: number | null;
  last_updated: string;
}

export interface GapItem {
  skill: string;
  importance: SkillImportance;
  user_level: "none" | "beginner" | "intermediate" | "advanced";
  gap_reason: string;
  severity: GapSeverity;
  recommendations: GapRecommendation[];
}

export interface GapRecommendation {
  type: "course" | "project" | "certification" | "practice";
  title: string;
  platform?: string;
  url?: string;
  time_to_complete?: string;
  why_this: string;
}

export interface SkillGapReport {
  id: string;
  user_id: string;
  resume_id: string | null;
  job_role_id: string | null;
  jd_id: string | null;
  overall_match: number;
  gap_items: GapItem[];
  recommendations: GapRecommendation[];
  generated_at: string;
}

export interface QuestionOption {
  label: string;
  value: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  job_role_id: string | null;
  skill_id: string | null;
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  explanation: string | null;
  topic_tags: string[] | null;
  is_ai_generated: boolean;
  created_at: string;
}

export interface TestSession {
  id: string;
  user_id: string;
  job_role_id: string | null;
  session_type: "adaptive" | "fixed" | "custom";
  status: SessionStatus;
  total_questions: number | null;
  time_limit_mins: number | null;
  started_at: string;
  completed_at: string | null;
  overall_score: number | null;
  topic_scores: Record<string, number> | null;
}

export interface TestAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_answer: string | null;
  is_correct: boolean | null;
  time_taken_secs: number | null;
  difficulty_at_attempt: Difficulty | null;
  created_at: string;
}

export interface InterviewScoreBreakdown {
  clarity: number;
  relevance: number;
  structure: number;
  confidence: number;
  accuracy: number | null;
  communication: number;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  resume_id: string | null;
  job_role_id: string | null;
  jd_id: string | null;
  mode: InterviewMode;
  interview_type: InterviewType | null;
  status: SessionStatus;
  total_questions: number;
  duration_secs: number | null;
  video_url: string | null;
  overall_score: number | null;
  score_breakdown: InterviewScoreBreakdown | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  summary: string | null;
  recruiter_shared: boolean;
  share_token: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface InterviewQA {
  id: string;
  session_id: string;
  turn_index: number;
  question_text: string;
  question_type: "technical" | "behavioral" | "situational" | "followup" | null;
  answer_text: string | null;
  answer_audio_url: string | null;
  answer_video_url: string | null;
  score_clarity: number | null;
  score_relevance: number | null;
  score_structure: number | null;
  score_confidence: number | null;
  score_accuracy: number | null;
  score_communication: number | null;
  composite_score: number | null;
  feedback: string | null;
  sample_answer: string | null;
  is_followup: boolean;
  parent_qa_id: string | null;
  created_at: string;
}

export interface RoadmapItem {
  id: string;
  user_id: string;
  skill_id: string | null;
  item_type: RoadmapItemType;
  title: string;
  description: string | null;
  url: string | null;
  priority: number;
  status: RoadmapItemStatus;
  source: "gap_report" | "interview" | "test" | "manual" | null;
  source_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ReadinessSnapshot {
  id: string;
  user_id: string;
  job_role_id: string | null;
  readiness_score: number;
  resume_score: number | null;
  test_score: number | null;
  interview_score: number | null;
  skill_coverage: number | null;
  snapshot_at: string;
}

export interface RecruiterView {
  id: string;
  recruiter_id: string | null;
  candidate_id: string | null;
  interview_session_id: string | null;
  viewed_at: string;
  notes: string | null;
  rating: number | null;
}

export interface RecruiterTemplate {
  id: string;
  recruiter_id: string;
  org_id: string | null;
  title: string;
  job_role_id: string | null;
  custom_questions: Json | null;
  instructions: string | null;
  created_at: string;
}
