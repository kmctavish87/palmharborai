export const STUDY_SEARCH_TERMS = [
  "transcranial magnetic stimulation",
  "TMS depression",
  "repetitive transcranial magnetic stimulation",
  "rTMS",
  "TMS treatment resistant depression",
  "TMS addiction",
  "TMS anxiety",
  "TMS OCD",
  "TMS PTSD",
  "TMS chronic pain",
  "TMS veterans",
  "TMS adolescents",
  "theta burst stimulation",
  "deep TMS",
];

export const NEWS_SEARCH_TERMS = [
  "transcranial magnetic stimulation",
  "TMS therapy",
  "TMS depression treatment",
  "TMS addiction treatment",
  "TMS mental health",
  "TMS clinic",
  "TMS FDA",
  "TMS treatment resistant depression",
];

export const FILTER_TAGS = [
  "Depression",
  "Treatment-resistant depression",
  "Addiction",
  "Anxiety",
  "OCD",
  "PTSD",
  "Chronic pain",
  "Adolescents",
  "Veterans",
  "Insurance",
  "FDA/Regulatory",
  "Outcomes",
  "Patient stories",
  "Clinical trials",
];

export const TAG_RULES = [
  { tag: "Depression", patterns: ["depression", "major depressive disorder", "mdd"] },
  {
    tag: "Treatment-resistant depression",
    patterns: ["treatment-resistant depression", "treatment resistant depression", "trd"],
  },
  { tag: "Addiction", patterns: ["addiction", "substance", "alcohol", "opioid", "cocaine", "nicotine"] },
  { tag: "Anxiety", patterns: ["anxiety", "panic", "generalized anxiety"] },
  { tag: "OCD", patterns: ["ocd", "obsessive-compulsive"] },
  { tag: "PTSD", patterns: ["ptsd", "post-traumatic stress"] },
  { tag: "Chronic pain", patterns: ["chronic pain", "pain", "fibromyalgia", "neuropathic"] },
  { tag: "Adolescents", patterns: ["adolescent", "adolescents", "youth", "teen"] },
  { tag: "Veterans", patterns: ["veteran", "veterans", "military"] },
  { tag: "Insurance", patterns: ["insurance", "coverage", "payer", "reimbursement"] },
  { tag: "FDA/Regulatory", patterns: ["fda", "clearance", "approval", "regulatory"] },
  { tag: "Outcomes", patterns: ["outcome", "remission", "response", "efficacy", "effectiveness"] },
  { tag: "Patient stories", patterns: ["patient story", "personal story", "testimonial", "experience"] },
  { tag: "Clinical trials", patterns: ["clinical trial", "randomized", "study protocol", "trial"] },
];

export const REFRESH_INTERVAL_DAYS = 15;
export const DEFAULT_STUDY_LIMIT = 80;
export const DEFAULT_NEWS_LIMIT = 80;
