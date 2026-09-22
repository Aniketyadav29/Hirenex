-- ─────────────────────────────────────────────────────────────────────────────
-- HireNex — Complete Database Schema Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for semantic search

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'candidate'
                    CHECK (role IN ('candidate', 'recruiter', 'admin')),
  target_role     TEXT,
  experience_yrs  SMALLINT DEFAULT 0 CHECK (experience_yrs >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── ORGANIZATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  domain      TEXT,
  logo_url    TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_role    TEXT NOT NULL DEFAULT 'member'
                CHECK (org_role IN ('owner', 'admin', 'member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ─── RESUMES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resumes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  raw_text        TEXT,
  parse_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (parse_status IN ('pending', 'processing', 'done', 'failed')),
  parsed_at       TIMESTAMPTZ,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one primary resume per user
CREATE UNIQUE INDEX IF NOT EXISTS resumes_primary_unique
  ON public.resumes(user_id) WHERE is_primary = TRUE;

CREATE TABLE IF NOT EXISTS public.resume_parsed_data (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id         UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE UNIQUE,
  personal_info     JSONB,
  education         JSONB,
  experience        JSONB,
  projects          JSONB,
  certifications    JSONB,
  extracted_skills  JSONB,
  ats_score         SMALLINT CHECK (ats_score BETWEEN 0 AND 100),
  ats_feedback      JSONB,
  embedding         vector(768),
  parsed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── JOB ROLES & DESCRIPTIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  category        TEXT,
  level           TEXT CHECK (level IN ('junior', 'mid', 'senior', 'lead')),
  required_skills JSONB,
  description     TEXT,
  embedding       vector(768),
  is_system       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_descriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raw_text        TEXT NOT NULL,
  parsed_role     TEXT,
  parsed_skills   JSONB,
  embedding       vector(768),
  job_role_id     UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SKILLS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  category    TEXT,
  aliases     TEXT[],
  embedding   vector(768)
);

CREATE TABLE IF NOT EXISTS public.user_skill_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id          UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  confidence        NUMERIC(3,2) NOT NULL DEFAULT 0
                      CHECK (confidence BETWEEN 0 AND 1),
  source_resume     NUMERIC(3,2) CHECK (source_resume BETWEEN 0 AND 1),
  source_tests      NUMERIC(3,2) CHECK (source_tests BETWEEN 0 AND 1),
  source_interview  NUMERIC(3,2) CHECK (source_interview BETWEEN 0 AND 1),
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

-- ─── SKILL GAP REPORTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skill_gap_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id       UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_role_id     UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  jd_id           UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  overall_match   NUMERIC(5,2) CHECK (overall_match BETWEEN 0 AND 100),
  gap_items       JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── QUESTION BANK ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.question_bank (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id     UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  skill_id        UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL
                    CHECK (question_type IN ('mcq', 'coding', 'short_answer', 'aptitude')),
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  options         JSONB,
  correct_answer  TEXT,
  explanation     TEXT,
  topic_tags      TEXT[],
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TEST SESSIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_role_id     UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  session_type    TEXT NOT NULL DEFAULT 'adaptive'
                    CHECK (session_type IN ('adaptive', 'fixed', 'custom')),
  status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  total_questions SMALLINT,
  time_limit_mins SMALLINT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  overall_score   NUMERIC(5,2) CHECK (overall_score BETWEEN 0 AND 100),
  topic_scores    JSONB
);

CREATE TABLE IF NOT EXISTS public.test_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  question_id           UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  user_answer           TEXT,
  is_correct            BOOLEAN,
  time_taken_secs       SMALLINT,
  difficulty_at_attempt TEXT CHECK (difficulty_at_attempt IN ('easy', 'medium', 'hard')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INTERVIEW SESSIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id        UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_role_id      UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  jd_id            UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  mode             TEXT NOT NULL DEFAULT 'text'
                     CHECK (mode IN ('text', 'voice', 'video')),
  interview_type   TEXT CHECK (interview_type IN ('behavioral', 'technical', 'mixed', 'hr')),
  status           TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  total_questions  SMALLINT NOT NULL DEFAULT 0,
  duration_secs    INTEGER,
  video_url        TEXT,
  overall_score    NUMERIC(4,2) CHECK (overall_score BETWEEN 0 AND 10),
  score_breakdown  JSONB,
  strengths        TEXT[],
  weaknesses       TEXT[],
  summary          TEXT,
  recruiter_shared BOOLEAN NOT NULL DEFAULT FALSE,
  share_token      TEXT UNIQUE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.interview_qa (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  turn_index            SMALLINT NOT NULL,
  question_text         TEXT NOT NULL,
  question_type         TEXT CHECK (question_type IN ('technical', 'behavioral', 'situational', 'followup')),
  answer_text           TEXT,
  answer_audio_url      TEXT,
  answer_video_url      TEXT,
  score_clarity         NUMERIC(3,1) CHECK (score_clarity BETWEEN 1 AND 10),
  score_relevance       NUMERIC(3,1) CHECK (score_relevance BETWEEN 1 AND 10),
  score_structure       NUMERIC(3,1) CHECK (score_structure BETWEEN 1 AND 10),
  score_confidence      NUMERIC(3,1) CHECK (score_confidence BETWEEN 1 AND 10),
  score_accuracy        NUMERIC(3,1) CHECK (score_accuracy BETWEEN 1 AND 10),
  score_communication   NUMERIC(3,1) CHECK (score_communication BETWEEN 1 AND 10),
  composite_score       NUMERIC(3,1) CHECK (composite_score BETWEEN 1 AND 10),
  feedback              TEXT,
  sample_answer         TEXT,
  is_followup           BOOLEAN NOT NULL DEFAULT FALSE,
  parent_qa_id          UUID REFERENCES public.interview_qa(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, turn_index)
);

-- ─── ROADMAP & DASHBOARD ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id     UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  item_type    TEXT NOT NULL
                 CHECK (item_type IN ('course', 'project', 'certification', 'practice')),
  title        TEXT NOT NULL,
  description  TEXT,
  url          TEXT,
  priority     SMALLINT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed')),
  source       TEXT CHECK (source IN ('gap_report', 'interview', 'test', 'manual')),
  source_id    UUID,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.readiness_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_role_id     UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  readiness_score NUMERIC(5,2) NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
  resume_score    NUMERIC(5,2) CHECK (resume_score BETWEEN 0 AND 100),
  test_score      NUMERIC(5,2) CHECK (test_score BETWEEN 0 AND 100),
  interview_score NUMERIC(5,2) CHECK (interview_score BETWEEN 0 AND 100),
  skill_coverage  NUMERIC(5,2) CHECK (skill_coverage BETWEEN 0 AND 100),
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RECRUITER PORTAL ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_views (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  candidate_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  interview_session_id  UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  viewed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes                 TEXT,
  rating                SMALLINT CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS public.recruiter_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id           UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  job_role_id      UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  custom_questions JSONB,
  instructions     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_status ON public.resumes(parse_status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON public.interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_qa_session ON public.interview_qa(session_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON public.test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_session ON public.test_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_profiles_user ON public.user_skill_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_reports_user ON public.skill_gap_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_user ON public.roadmap_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_user ON public.readiness_snapshots(user_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_bank_role ON public.question_bank(job_role_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_share_token ON public.interview_sessions(share_token) WHERE share_token IS NOT NULL;

-- Vector similarity search indexes (IVFFlat — efficient for ~100k rows)
CREATE INDEX IF NOT EXISTS idx_resume_embedding ON public.resume_parsed_data
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_job_role_embedding ON public.job_roles
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_parsed_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_templates ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit only their own; admins see all
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Resumes: users own their resumes
CREATE POLICY "resumes_select_own" ON public.resumes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "resumes_insert_own" ON public.resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resumes_update_own" ON public.resumes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "resumes_delete_own" ON public.resumes
  FOR DELETE USING (auth.uid() = user_id);

-- Resume parsed data: owned by resume owner
CREATE POLICY "resume_parsed_select" ON public.resume_parsed_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.resumes r WHERE r.id = resume_id AND r.user_id = auth.uid())
  );

-- Interview sessions: own + public share token
CREATE POLICY "interview_sessions_select_own" ON public.interview_sessions
  FOR SELECT USING (auth.uid() = user_id OR recruiter_shared = TRUE);
CREATE POLICY "interview_sessions_insert_own" ON public.interview_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "interview_sessions_update_own" ON public.interview_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Interview Q&A: via session ownership
CREATE POLICY "interview_qa_select" ON public.interview_qa
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.recruiter_shared = TRUE)
    )
  );
CREATE POLICY "interview_qa_insert" ON public.interview_qa
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

-- Test sessions & answers: own only
CREATE POLICY "test_sessions_own" ON public.test_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "test_answers_own" ON public.test_answers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid())
  );

-- Skill profiles, gap reports, roadmap, snapshots: own only
CREATE POLICY "user_skill_profiles_own" ON public.user_skill_profiles
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "skill_gap_reports_own" ON public.skill_gap_reports
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "roadmap_items_own" ON public.roadmap_items
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "readiness_snapshots_own" ON public.readiness_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Recruiter policies
CREATE POLICY "recruiter_views_own" ON public.recruiter_views
  FOR ALL USING (auth.uid() = recruiter_id);
CREATE POLICY "recruiter_templates_own" ON public.recruiter_templates
  FOR ALL USING (auth.uid() = recruiter_id);

-- ─── SEED: CORE JOB ROLES ─────────────────────────────────────────────────────
INSERT INTO public.job_roles (title, category, level, required_skills, description, is_system) VALUES
('Frontend Engineer', 'Engineering', 'mid', '["React","TypeScript","CSS","HTML","REST APIs","Git","Testing"]', 'Builds user-facing web applications', TRUE),
('Backend Engineer', 'Engineering', 'mid', '["Node.js","Python","SQL","REST APIs","Databases","Docker","Git"]', 'Builds server-side logic and APIs', TRUE),
('Full Stack Engineer', 'Engineering', 'mid', '["React","Node.js","TypeScript","PostgreSQL","REST APIs","Docker","Git"]', 'Works across frontend and backend', TRUE),
('Data Scientist', 'Data', 'mid', '["Python","Machine Learning","SQL","Pandas","Statistics","Data Visualization","Scikit-learn"]', 'Analyzes data and builds ML models', TRUE),
('DevOps Engineer', 'Engineering', 'mid', '["Docker","Kubernetes","CI/CD","AWS","Linux","Terraform","Monitoring"]', 'Manages infrastructure and deployment pipelines', TRUE),
('Product Manager', 'Product', 'mid', '["Product Strategy","Roadmapping","Stakeholder Management","Data Analysis","Agile","User Research","Communication"]', 'Defines product vision and drives delivery', TRUE),
('UI/UX Designer', 'Design', 'mid', '["Figma","User Research","Wireframing","Prototyping","Design Systems","Accessibility","CSS"]', 'Designs user experiences and interfaces', TRUE),
('Machine Learning Engineer', 'Engineering', 'senior', '["Python","PyTorch","TensorFlow","ML Ops","Docker","SQL","System Design"]', 'Builds and deploys production ML systems', TRUE),
('Mobile Engineer (React Native)', 'Engineering', 'mid', '["React Native","TypeScript","iOS","Android","REST APIs","Redux","Git"]', 'Builds cross-platform mobile apps', TRUE),
('Senior Backend Engineer', 'Engineering', 'senior', '["System Design","Distributed Systems","SQL","NoSQL","Docker","Kubernetes","Performance Optimization"]', 'Designs scalable backend systems', TRUE)
ON CONFLICT DO NOTHING;

-- ─── SEED: CORE SKILLS ────────────────────────────────────────────────────────
INSERT INTO public.skills (name, category, aliases) VALUES
('React', 'Frontend', ARRAY['ReactJS', 'React.js']),
('TypeScript', 'Languages', ARRAY['TS']),
('JavaScript', 'Languages', ARRAY['JS', 'ES6', 'ES2015']),
('Node.js', 'Backend', ARRAY['NodeJS', 'Node']),
('Python', 'Languages', ARRAY['Python 3']),
('PostgreSQL', 'Databases', ARRAY['Postgres', 'PSQL']),
('MySQL', 'Databases', ARRAY['SQL']),
('MongoDB', 'Databases', ARRAY['Mongo']),
('Docker', 'DevOps', ARRAY['Containerization']),
('Kubernetes', 'DevOps', ARRAY['K8s']),
('AWS', 'Cloud', ARRAY['Amazon Web Services', 'Amazon AWS']),
('REST APIs', 'Backend', ARRAY['RESTful API', 'REST']),
('GraphQL', 'Backend', ARRAY[]),
('Git', 'Tools', ARRAY['Version Control', 'GitHub']),
('System Design', 'Architecture', ARRAY['System Architecture']),
('Machine Learning', 'AI/ML', ARRAY['ML']),
('React Native', 'Mobile', ARRAY[]),
('Next.js', 'Frontend', ARRAY['NextJS']),
('Tailwind CSS', 'Frontend', ARRAY['Tailwind']),
('CI/CD', 'DevOps', ARRAY['Continuous Integration', 'Continuous Deployment'])
ON CONFLICT (name) DO NOTHING;
