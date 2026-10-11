import type {
  SessionOut,
  QuestionOut,
  AttemptIn,
  AttemptOut,
  ScoreOut,
  Analysis,
  RepairOut,
  ReverifyOut,
  GraphData,
  HealthOut,
  ClassItem,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.94.249.197.142.sslip.io/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const data = await res.json();
      if (data && data.detail) {
        errorDetail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Ignore JSON parse errors for non-JSON error responses
    }
    throw new ApiError(errorDetail, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: () => request<HealthOut>("/health"),

  // NCERT Classes
  getClasses: () => request<ClassItem[]>("/classes"),

  // Sessions
  createSession: (payload?: { label?: string; grade?: number }) =>
    request<SessionOut>("/sessions", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),

  getSession: (sessionId: string) =>
    request<SessionOut>(`/sessions/${sessionId}`),

  createDemoSession: () =>
    request<SessionOut>("/demo/session", {
      method: "POST",
    }),

  // Diagnostic (accepts optional session_id to get class-specific questions)
  getDiagnostic: (sessionId?: string) =>
    request<QuestionOut[]>(sessionId ? `/diagnostic?session_id=${sessionId}` : "/diagnostic"),

  // Attempts (for both diagnostic and repair)
  getAttempts: (sessionId: string) =>
    request<AttemptOut[]>(`/sessions/${sessionId}/attempts`),

  submitAttempt: (payload: AttemptIn) =>
    request<AttemptOut>("/attempts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Score
  getScore: (sessionId: string) =>
    request<ScoreOut>(`/sessions/${sessionId}/score`),

  // Debug (root cause & trace)
  runDebug: (sessionId: string) =>
    request<Analysis>(`/sessions/${sessionId}/debug`, {
      method: "POST",
    }),

  // Read-only Debt snapshot
  getDebt: (sessionId: string) =>
    request<Analysis>(`/sessions/${sessionId}/debt`),

  // Graph
  getGraph: (sessionId?: string) =>
    request<GraphData>(sessionId ? `/graph?session_id=${sessionId}` : "/graph"),

  // Repair
  startRepair: (sessionId: string, count = 3) =>
    request<RepairOut>(`/sessions/${sessionId}/repair?count=${count}`, {
      method: "POST",
    }),

  // Re-verify
  reverify: (sessionId: string) =>
    request<ReverifyOut>(`/sessions/${sessionId}/reverify`, {
      method: "POST",
    }),
};
