// ─── Resume Parsing & ATS Scoring Service ─────────────────────────────────────
// Orchestrates: text extraction → LLM structured parsing → ATS rule-based scoring

import { llmJSON } from "@/lib/llm/client";
import type { LLMMessage } from "@/lib/llm/client";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ParsedResume {
  personal_info: {
    name: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    github: string | null;
    location: string | null;
  };
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start: string;
    end: string;
    gpa?: string;
  }>;
  experience: Array<{
    company: string;
    title: string;
    start: string;
    end: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    tech_stack: string[];
    links: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    url?: string;
  }>;
  skills: Array<{
    skill: string;
    category: string;
    confidence: number;
    source: "experience" | "project" | "certification" | "explicit";
  }>;
}

export interface ATSResult {
  score: number; // 0–100
  feedback: Array<{
    issue: string;
    severity: "critical" | "warning" | "info";
    suggestion: string;
  }>;
}

// ─── LLM Resume Parser ────────────────────────────────────────────────────────
export async function parseResumeWithLLM(rawText: string): Promise<ParsedResume> {
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You are an expert resume parser. Extract structured information from the resume text provided.
Return ONLY valid JSON matching the exact schema. Use null for missing fields, empty arrays [] for missing lists.
Infer skill confidence (0.0-1.0) based on how prominently the skill appears (years of experience, frequency, recency).
Categorize skills as: Frontend, Backend, Languages, Databases, DevOps, Cloud, AI/ML, Mobile, Tools, Soft Skills, Other.
For source, use: 'experience' if found in work bullets, 'project' if in projects, 'certification' if from certs, 'explicit' if in a skills section.`,
    },
    {
      role: "user",
      content: `Parse this resume and return structured JSON:

SCHEMA:
{
  "personal_info": { "name": string|null, "email": string|null, "phone": string|null, "linkedin": string|null, "github": string|null, "location": string|null },
  "education": [{ "institution": string, "degree": string, "field": string, "start": string, "end": string, "gpa": string|null }],
  "experience": [{ "company": string, "title": string, "start": string, "end": string, "bullets": string[] }],
  "projects": [{ "name": string, "description": string, "tech_stack": string[], "links": string[] }],
  "certifications": [{ "name": string, "issuer": string, "date": string, "url": string|null }],
  "skills": [{ "skill": string, "category": string, "confidence": number, "source": string }]
}

RESUME TEXT:
${rawText.slice(0, 6000)}`,
    },
  ];

  return llmJSON<ParsedResume>(messages, { temperature: 0.1 });
}

// ─── ATS Scoring (Rule-Based) ─────────────────────────────────────────────────
// This is intentionally rule-based for speed, determinism, and explainability.
// LLM is not needed here — ATS systems follow predictable formatting rules.
export function scoreATS(rawText: string, parsed: ParsedResume): ATSResult {
  const feedback: ATSResult["feedback"] = [];
  let score = 100;

  // 1. Contact information completeness
  const { personal_info } = parsed;
  if (!personal_info.email) {
    feedback.push({ issue: "Missing email address", severity: "critical", suggestion: "Add a professional email address in the header." });
    score -= 15;
  }
  if (!personal_info.phone) {
    feedback.push({ issue: "Missing phone number", severity: "warning", suggestion: "Include a phone number for recruiter callbacks." });
    score -= 5;
  }
  if (!personal_info.linkedin) {
    feedback.push({ issue: "No LinkedIn profile URL", severity: "info", suggestion: "Add your LinkedIn profile URL to increase credibility by 40%." });
    score -= 3;
  }

  // 2. Section headers (ATS must detect them)
  const requiredSections = ["experience", "education", "skills"];
  const textLower = rawText.toLowerCase();
  for (const section of requiredSections) {
    if (!textLower.includes(section)) {
      feedback.push({
        issue: `Section heading "${section}" not clearly labeled`,
        severity: "critical",
        suggestion: `Add a clear "${section.charAt(0).toUpperCase() + section.slice(1)}" section heading. ATS systems scan for exact keywords.`,
      });
      score -= 10;
    }
  }

  // 3. Length check
  const wordCount = rawText.split(/\s+/).length;
  if (wordCount < 200) {
    feedback.push({ issue: "Resume is too short", severity: "critical", suggestion: "Expand your resume to at least 300–500 words. Add project details, impact metrics, and responsibilities." });
    score -= 15;
  } else if (wordCount > 1000) {
    feedback.push({ issue: "Resume may be too long", severity: "warning", suggestion: "For most roles, keep your resume to 1–2 pages (400–800 words). Trim older or less relevant experience." });
    score -= 5;
  }

  // 4. Quantified achievements
  const hasNumbers = /\d+[\%\+x]|\$[\d,]+|increased|reduced|improved|achieved|led \d+|managed \d+/i.test(rawText);
  if (!hasNumbers) {
    feedback.push({ issue: "No quantified achievements found", severity: "warning", suggestion: "Add numbers to your bullet points (e.g., 'Reduced load time by 40%', 'Led team of 5'). This is the #1 factor in resume scoring." });
    score -= 10;
  }

  // 5. Action verbs
  const actionVerbs = ["built", "developed", "designed", "implemented", "led", "managed", "architected", "created", "improved", "launched", "optimized", "automated", "deployed"];
  const hasActionVerbs = actionVerbs.some((v) => textLower.includes(v));
  if (!hasActionVerbs) {
    feedback.push({ issue: "Weak or missing action verbs", severity: "warning", suggestion: "Start each bullet point with a strong action verb: Built, Developed, Led, Architected, Optimized, etc." });
    score -= 8;
  }

  // 6. Skills section
  if (!parsed.skills || parsed.skills.length < 3) {
    feedback.push({ issue: "Too few skills listed", severity: "warning", suggestion: "Add a dedicated Skills section with at least 8–15 relevant technical and soft skills." });
    score -= 8;
  }

  // 7. Education section
  if (!parsed.education || parsed.education.length === 0) {
    feedback.push({ issue: "No education section found", severity: "critical", suggestion: "Add your education — institution, degree, field of study, and graduation year." });
    score -= 12;
  }

  // 8. Special characters / formatting issues (ATS unfriendly)
  const hasSpecialChars = /[│┃┆◆▪•◈★☆✓✗→←↑↓]/u.test(rawText);
  if (hasSpecialChars) {
    feedback.push({ issue: "Special Unicode characters detected", severity: "warning", suggestion: "Replace Unicode bullets/arrows with plain text dashes (-) or standard bullets. Some ATS systems can't parse them." });
    score -= 5;
  }

  // 9. Tables or columns
  const hasTablePattern = /\t.*\t|\|.*\|/m.test(rawText);
  if (hasTablePattern) {
    feedback.push({ issue: "Tables or multi-column layout detected", severity: "critical", suggestion: "Remove tables and multi-column layouts — ATS systems read resumes linearly and will misparse columns." });
    score -= 12;
  }

  // 10. File type bonus (enforced upstream, noted here)
  if (parsed.experience && parsed.experience.length > 0) {
    const hasDateRange = parsed.experience.some(
      (e) => e.start && e.end
    );
    if (!hasDateRange) {
      feedback.push({ issue: "Missing date ranges in experience", severity: "warning", suggestion: "Add start and end dates (MM/YYYY) to each experience entry." });
      score -= 5;
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    feedback,
  };
}

// ─── Skill Gap Analyzer ───────────────────────────────────────────────────────
export interface GapAnalysisResult {
  gaps: Array<{
    skill: string;
    importance: "required" | "preferred";
    user_level: "none" | "beginner" | "intermediate" | "advanced";
    gap_reason: string;
    severity: "high" | "medium" | "low";
    recommendations: Array<{
      type: "course" | "project" | "certification" | "practice";
      title: string;
      platform?: string;
      url?: string;
      time_to_complete?: string;
      why_this: string;
    }>;
  }>;
  strengths: string[];
  overall_match_pct: number;
}

export async function analyzeSkillGap(
  candidateSkills: ParsedResume["skills"],
  targetRoleTitle: string,
  requiredSkills: string[],
  jobDescriptionText?: string
): Promise<GapAnalysisResult> {
  // Rule-based pre-pass: compute exact/alias matches
  const candidateSkillNames = candidateSkills.map((s) => s.skill.toLowerCase());

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const required of requiredSkills) {
    const isMatch = candidateSkillNames.some(
      (cs) =>
        cs.includes(required.toLowerCase()) ||
        required.toLowerCase().includes(cs)
    );
    if (isMatch) matchedSkills.push(required);
    else missingSkills.push(required);
  }

  // LLM pass: generate explainable gap reasons + recommendations
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You are a senior career coach. Analyze skill gaps between a candidate and a target role. 
Return ONLY valid JSON. Be specific and evidence-based in gap_reason — cite what you see (or don't see) in the candidate's profile.
Provide 1–3 actionable, real course/project recommendations per gap. Use real platforms (Coursera, Udemy, LeetCode, etc.).`,
    },
    {
      role: "user",
      content: `Target Role: ${targetRoleTitle}

Candidate's Current Skills:
${JSON.stringify(candidateSkills.slice(0, 30), null, 2)}

Skills ALREADY MATCHED: ${matchedSkills.join(", ")}
Skills MISSING/WEAK: ${missingSkills.join(", ")}

${jobDescriptionText ? `Job Description Excerpt:\n${jobDescriptionText.slice(0, 1500)}` : ""}

Analyze each missing/weak skill and return:
{
  "gaps": [{
    "skill": string,
    "importance": "required" | "preferred",
    "user_level": "none" | "beginner" | "intermediate" | "advanced",
    "gap_reason": "Explain WHY this is flagged — reference what's missing from the resume",
    "severity": "high" | "medium" | "low",
    "recommendations": [{
      "type": "course" | "project" | "certification" | "practice",
      "title": string,
      "platform": string,
      "url": string,
      "time_to_complete": string,
      "why_this": string
    }]
  }],
  "strengths": [string],
  "overall_match_pct": number
}`,
    },
  ];

  return llmJSON<GapAnalysisResult>(messages, { temperature: 0.3 });
}
