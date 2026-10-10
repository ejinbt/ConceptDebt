export type Phase = "diagnostic" | "debugged" | "repair" | "done";
export type Status = "root" | "trace" | "failed" | "at_risk" | "ok";
export type Kind = "number" | "expression" | "factored";

export interface SessionOut {
  session_id: string;
  label: string | null;
  phase: Phase;
  root_concept_id: string | null;
  answered: number;
  created_at: string;
}

export interface QuestionOut {
  id: string;
  concept_id: string;
  concept_name: string;
  kind: Kind;
  prompt: string;
  is_repair: boolean;
}

export interface AttemptIn {
  session_id: string;
  question_id: string;
  answer: string;
  working?: string | null;
  time_ms?: number | null;
}

export interface MisconceptionRef {
  id: string;
  name: string;
}

export interface MisconceptionCount extends MisconceptionRef {
  count: number;
}

export interface AttemptOut {
  attempt_id: number;
  question_id: string;
  mode: "diagnostic" | "repair";
  answer: string;
  working: string | null;
  correct: boolean;
  correct_answer: string;
  misconception: MisconceptionRef | null;
  confidence: number;
  source: "rule" | "ai" | "unclassified" | "correct" | "invalid";
  rationale: string | null;
}

export interface ScoreOut {
  session_id: string;
  answered: number;
  correct: number;
  total_questions: number;
  percent: number;
}

export interface ConceptDebt {
  concept_id: string;
  name: string;
  level: number;
  debt: number;
  mistakes: number;
  evidence_count: number;
  confidence: number;
  affected_topics: string[];
  misconceptions: MisconceptionCount[];
  status: Status;
}

export interface Root {
  concept_id: string;
  name: string;
  debt: number;
  confidence: number;
  coverage: number;
  mistakes: number;
  affected_topics: string[];
  misconceptions: MisconceptionCount[];
}

export interface TraceStep {
  concept_id: string;
  name: string;
  debt: number;
}

export interface Analysis {
  session_id: string;
  phase: Phase;
  answered: number;
  wrong: number;
  root: Root | null;
  trace: TraceStep[];
  concepts: ConceptDebt[];
  explanation: {
    summary: string;
    advice: string;
    source: "ai" | "template";
  };
}

export interface RepairOut {
  session_id: string;
  root: TraceStep;
  questions: QuestionOut[];
}

export interface DebtChange {
  concept_id: string;
  name: string;
  before: number;
  after: number;
  change: number;
}

export interface ReverifyOut {
  session_id: string;
  root_concept_id: string | null;
  root_before: number;
  root_after: number;
  changes: DebtChange[];
  repair_answered: number;
  repair_correct: number;
  analysis: Analysis;
}

export interface GraphNode {
  id: string;
  name: string;
  level: number;
  description: string;
  debt: number;
  status: Status;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface HealthOut {
  status: string;
  ai_enabled: boolean;
  ai_model: string;
  ai_stats: {
    calls: number;
    ok: number;
    failed: number;
    last_error: string | null;
  };
}
