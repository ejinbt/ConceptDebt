import { useState, useEffect } from "react";
import type { SessionOut } from "../types/api";
import type { NavView } from "../components/Navbar";

const SESSION_STORAGE_KEY = "concept_debt_active_session";
const VIEW_STORAGE_KEY = "concept_debt_active_view";

export function useSessionStore() {
  const [session, setSession] = useState<SessionOut | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [savedView, setSavedView] = useState<NavView>(() => {
    try {
      const view = localStorage.getItem(VIEW_STORAGE_KEY) as NavView | null;
      return view || "initial";
    } catch {
      return "initial";
    }
  });

  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Storage full or unavailable
      }
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(VIEW_STORAGE_KEY);
    }
  }, [session]);

  const updateView = (view: NavView) => {
    setSavedView(view);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Storage unavailable
    }
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(VIEW_STORAGE_KEY);
    setSession(null);
    setSavedView("initial");
  };

  return { session, setSession, savedView, updateView, clearSession };
}
