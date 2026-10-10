import { useState, useEffect } from "react";
import { Navbar, type NavView } from "./components/Navbar";
import { DiagnosticView } from "./components/DiagnosticView";
import { ScoreView } from "./components/ScoreView";
import { DebugConsole } from "./components/DebugConsole";
import { ConceptGraph } from "./components/ConceptGraph";
import { RepairView } from "./components/RepairView";
import { ReverifyView } from "./components/ReverifyView";
import { ConfirmModal } from "./components/ConfirmModal";
import { useSessionStore } from "./hooks/useSessionStore";
import { Play, ArrowRight, ShieldAlert, Sparkles, Activity, Layers, GraduationCap } from "lucide-react";
import { api } from "./services/api";
import type { ClassItem } from "./types/api";

export function App() {
  const { session, setSession, savedView, updateView, clearSession } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Use savedView from store (persisted in localStorage)
  const currentView = savedView;
  const setCurrentView = (view: NavView) => {
    updateView(view);
  };

  const [isDebugging, setIsDebugging] = useState(false);
  const [cachedAnalysis, setCachedAnalysis] = useState<import("./types/api").Analysis | null>(null);
  const [useReadOnlyDebt, setUseReadOnlyDebt] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [graphTab, setGraphTab] = useState<"console" | "graph">("console");

  // Confirmation Modals State
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmExitTestOpen, setConfirmExitTestOpen] = useState(false);

  // Sync currentView when session changes phase
  useEffect(() => {
    if (!session) {
      setCurrentView("initial");
    }
  }, [session]);

  // Fetch available NCERT classes for picker
  useEffect(() => {
    api.getClasses()
      .then(setAvailableClasses)
      .catch(() => {
        setAvailableClasses([
          { grade: 8, label: "Class 8", questions: 12 },
          { grade: 9, label: "Class 9", questions: 12 },
          { grade: 10, label: "Class 10", questions: 15 },
        ]);
      });
  }, []);

  const handleStartNew = async () => {
    setLoading(true);
    setError(null);
    try {
      const newSession = await api.createSession({
        label: label.trim() || undefined,
        grade: selectedGrade,
      });
      setSession(newSession);
      setCurrentView("diagnostic");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoSession = await api.createDemoSession();
      setSession(demoSession);
      setCurrentView("score");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load demo session");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!resumeId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const restored = await api.getSession(resumeId.trim());
      setSession(restored);
      if (restored.phase === "done") setCurrentView("done");
      else if (restored.phase === "repair") setCurrentView("repair");
      else if (restored.phase === "debugged") setCurrentView("debugged");
      else if (restored.answered >= 5) setCurrentView("score");
      else setCurrentView("diagnostic");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Session not found");
    } finally {
      setLoading(false);
    }
  };

  const handleDebugLearning = async () => {
    if (!session) return;
    setIsDebugging(true);
    setUseReadOnlyDebt(false);
    setError(null);
    try {
      const analysisData = await api.runDebug(session.session_id);
      setCachedAnalysis(analysisData);
      const updated = await api.getSession(session.session_id);
      setSession(updated);
      setCurrentView("debugged");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run debug analysis");
    } finally {
      setIsDebugging(false);
    }
  };

  const handleStartRepair = () => {
    if (!session) return;
    setSession({
      ...session,
      phase: "repair",
    });
    setCurrentView("repair");
  };

  const handleFinishRepair = () => {
    if (!session) return;
    setSession({
      ...session,
      phase: "done",
    });
    setCurrentView("done");
  };

  const handleInspectDebugger = () => {
    // When inspecting debugger after repair, tell DebugConsole to use fast read-only GET /debt
    setUseReadOnlyDebt(true);
    setCachedAnalysis(null);
    setCurrentView("debugged");
  };

  const handleGoHome = () => {
    if (currentView === "diagnostic" && session && session.answered < 12) {
      setConfirmExitTestOpen(true);
    } else {
      setCurrentView("initial");
    }
  };

  const handleConfirmReset = () => {
    clearSession();
    setCurrentView("initial");
    setConfirmResetOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#F3F3F4] flex flex-col font-sans">
      <Navbar 
        currentView={currentView}
        sessionPhase={session?.phase || "initial"}
        sessionId={session?.session_id || null}
        grade={session?.grade}
        onNavigate={(view) => setCurrentView(view)}
        onReset={() => setConfirmResetOpen(true)}
        onGoHome={handleGoHome}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {/* Error notification */}
        {error && (
          <div className="mb-6 max-w-xl mx-auto w-full p-4 rounded-xl bg-[#6A040F]/30 border border-[#D00000] flex items-center gap-3 text-sm text-[#F3F3F4]">
            <ShieldAlert className="w-5 h-5 text-[#D00000] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. INITIAL LANDING SCREEN */}
        {currentView === "initial" && (
          <div className="max-w-3xl mx-auto w-full text-center py-6">
            {/* If a session is already in progress, show resume pill banner */}
            {session && (
              <div className="mb-6 p-4 rounded-2xl bg-[#2A2A2F] border border-[#6A040F] flex flex-wrap items-center justify-between gap-3 text-left">
                <div>
                  <div className="text-xs font-mono text-[#D00000] font-bold uppercase">
                    Session In Progress
                  </div>
                  <div className="text-sm font-semibold text-[#F3F3F4]">
                    {session.label || "Student"} · Class {session.grade || 10} · Phase: {session.phase.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (session.phase === "done") setCurrentView("done");
                      else if (session.phase === "repair") setCurrentView("repair");
                      else if (session.phase === "debugged") setCurrentView("debugged");
                      else if (session.answered >= 5) setCurrentView("score");
                      else setCurrentView("diagnostic");
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-white transition-colors"
                  >
                    Continue Session →
                  </button>
                  <button
                    onClick={() => setConfirmResetOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#0E0E10] hover:bg-[#35353B] text-xs font-mono text-[#9E9EA7] transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A2A2F] border border-[#35353B] text-xs font-mono text-[#9E9EA7] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#D00000] animate-pulse" />
              <span>NCERT CURRICULUM DIAGNOSTICS</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-display font-bold tracking-tight text-[#F3F3F4] mb-6">
              DEBUG YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D00000] via-[#6A040F] to-[#F3F3F4]">
                CONCEPT DEBT
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#9E9EA7] max-w-xl mx-auto mb-8 leading-relaxed font-sans">
              Traditional scores only report symptoms. We trace cascading errors backwards through the mathematics prerequisite graph to expose the foundational bug.
            </p>

            {/* Quick Actions Grid */}
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left mb-8">
              {/* Start Card with Class Picker */}
              <div className="p-6 rounded-2xl bg-[#2A2A2F] border border-[#35353B] hover:border-[#6A040F] transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#0E0E10] border border-[#35353B] flex items-center justify-center mb-4">
                    <GraduationCap className="w-5 h-5 text-[#F3F3F4]" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-[#F3F3F4] mb-1">
                    Start Diagnostic
                  </h3>
                  <p className="text-xs text-[#9E9EA7] mb-4">
                    Select your NCERT class to test aligned curriculum concepts.
                  </p>

                  {/* NCERT Class Picker Button Group */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-mono text-[#9E9EA7] uppercase mb-1.5">
                      Select Class / Grade
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0E0E10] border border-[#35353B]">
                      {(availableClasses.length > 0 ? availableClasses : [
                        { grade: 8, label: "Class 8", questions: 12 },
                        { grade: 9, label: "Class 9", questions: 12 },
                        { grade: 10, label: "Class 10", questions: 15 },
                      ]).map((item) => (
                        <button
                          key={item.grade}
                          type="button"
                          onClick={() => setSelectedGrade(item.grade)}
                          className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                            selectedGrade === item.grade
                              ? "bg-[#6A040F] text-[#F3F3F4] border border-[#D00000]/40 shadow-sm"
                              : "text-[#9E9EA7] hover:text-[#F3F3F4]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Enter nickname (optional)"
                    className="w-full bg-[#0E0E10] border border-[#35353B] rounded-lg px-3 py-2 text-xs text-[#F3F3F4] focus:outline-none focus:border-[#D00000] mb-4 font-mono"
                  />
                </div>
                <button
                  disabled={loading}
                  onClick={handleStartNew}
                  className="w-full py-2.5 rounded-lg bg-[#F3F3F4] hover:bg-white text-[#0E0E10] font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Starting..." : `Begin Class ${selectedGrade} Test`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Demo Card (Alex) */}
              <div className="p-6 rounded-2xl bg-[#2A2A2F] border border-[#35353B] hover:border-[#D00000]/60 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#6A040F] text-[10px] font-mono text-[#F3F3F4]">
                  EVALUATOR SHORTCUT
                </div>
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#6A040F]/30 border border-[#D00000]/40 flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5 text-[#D00000]" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-[#F3F3F4] mb-1">
                    Load Demo Student
                  </h3>
                  <p className="text-xs text-[#9E9EA7] mb-4">
                    Pre-answered Class 10 session (Alex, 53% symptom). Jump straight into root cause isolation and graph.
                  </p>
                </div>
                <button
                  disabled={loading}
                  onClick={handleLoadDemo}
                  className="w-full py-2.5 rounded-lg bg-[#6A040F] hover:bg-[#D00000] text-[#F3F3F4] font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 border border-[#D00000]/30"
                >
                  <span>{loading ? "Loading..." : "Load Demo Scenario"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Resume Session Bar */}
            <div className="max-w-xl mx-auto flex items-center gap-2 p-2 rounded-xl bg-[#2A2A2F]/60 border border-[#35353B]">
              <input
                type="text"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                placeholder="Or paste an existing session ID..."
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#F3F3F4] focus:outline-none font-mono"
              />
              <button
                onClick={handleResume}
                disabled={loading || !resumeId.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#35353B] hover:bg-[#4E4E58] text-xs font-semibold text-[#F3F3F4] transition-colors disabled:opacity-50"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* 2. DIAGNOSTIC ASSESSMENT VIEW */}
        {currentView === "diagnostic" && session && (
          <DiagnosticView
            session={session}
            onComplete={() => setCurrentView("score")}
            onSessionUpdate={(s) => setSession(s)}
            onExitTest={() => setConfirmExitTestOpen(true)}
          />
        )}

        {/* 3. SYMPTOM SCORE VIEW */}
        {currentView === "score" && session && (
          <ScoreView
            session={session}
            onBackToTest={() => setCurrentView("diagnostic")}
            onStartDebug={handleDebugLearning}
            isDebugging={isDebugging}
          />
        )}

        {/* 4. DEBUGGED CONSOLE & GRAPH VIEW */}
        {currentView === "debugged" && session && (
          <div className="w-full space-y-6">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-[#35353B] pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGraphTab("console")}
                  className={`px-4 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                    graphTab === "console"
                      ? "bg-[#6A040F] text-[#F3F3F4] border border-[#D00000]/40"
                      : "text-[#9E9EA7] hover:text-[#F3F3F4]"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>ROOT CAUSE & STACK TRACE</span>
                </button>

                <button
                  onClick={() => setGraphTab("graph")}
                  className={`px-4 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                    graphTab === "graph"
                      ? "bg-[#6A040F] text-[#F3F3F4] border border-[#D00000]/40"
                      : "text-[#9E9EA7] hover:text-[#F3F3F4]"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>KNOWLEDGE GRAPH VIEW</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-[#9E9EA7]">
                <button
                  onClick={() => setCurrentView("score")}
                  className="hover:text-[#F3F3F4] underline"
                >
                  ← Score Summary
                </button>
                {session.grade && <span>CLASS {session.grade}</span>}
              </div>
            </div>

            {graphTab === "console" ? (
              <DebugConsole
                session={session}
                initialAnalysis={cachedAnalysis}
                readOnlyDebt={useReadOnlyDebt}
                onStartRepair={handleStartRepair}
                onBackToScore={() => setCurrentView("score")}
                isRepairing={isRepairing}
              />
            ) : (
              <div className="space-y-4">
                <ConceptGraph sessionId={session.session_id} />
                <div className="text-center pt-2">
                  <button
                    onClick={handleStartRepair}
                    className="px-6 py-2.5 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-[#F3F3F4] tracking-wider uppercase transition-all shadow-lg"
                  >
                    Proceed to Repair Mode →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. REPAIR MODE DRILLS */}
        {currentView === "repair" && session && (
          <RepairView
            session={session}
            onFinishRepair={handleFinishRepair}
            onBackToDebugger={() => setCurrentView("debugged")}
            onSessionUpdate={(s) => setSession(s)}
          />
        )}

        {/* 6. REVERIFY & REGRESSION RESULTS */}
        {currentView === "done" && session && (
          <ReverifyView
            session={session}
            onNewSession={() => setConfirmResetOpen(true)}
            onInspectDebugger={handleInspectDebugger}
            onSessionUpdate={(s) => setSession(s)}
          />
        )}
      </main>

      {/* Confirmation Dialogs */}
      <ConfirmModal
        isOpen={confirmResetOpen}
        title="End Current Session?"
        message="This will reset your diagnostic progress and return to the home screen. You can always paste your session ID to resume later."
        confirmText="End Session"
        isDestructive={true}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <ConfirmModal
        isOpen={confirmExitTestOpen}
        title="Exit Diagnostic Test?"
        message="Your submitted answers are saved on the server. You can resume anytime from the start screen."
        confirmText="Exit to Home"
        onConfirm={() => {
          setConfirmExitTestOpen(false);
          setCurrentView("initial");
        }}
        onCancel={() => setConfirmExitTestOpen(false)}
      />

      <footer className="border-t border-[#35353B] py-4 text-center text-xs text-[#9E9EA7]">
        <span>Concept Debt · NCERT Mathematics Diagnostic Engine & Knowledge Graph</span>
      </footer>
    </div>
  );
}
export default App;
