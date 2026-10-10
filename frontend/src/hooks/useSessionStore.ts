import { useState, useEffect } from "react";
import type { SessionOut } from "../types/api";

const STORAGE_KEY = "concept_debt_active_session";

export function useSessionStore() {
  const [session, setSession] = useState<SessionOut | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Storage full or unavailable
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return { session, setSession, clearSession };
}
