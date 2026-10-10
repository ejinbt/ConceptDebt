import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { DiagnosticView } from "./components/DiagnosticView";
import { ScoreView } from "./components/ScoreView";
import { DebugConsole } from "./components/DebugConsole";
import { ConceptGraph } from "./components/ConceptGraph";
import { RepairView } from "./components/RepairView";
import { ReverifyView } from "./components/ReverifyView";
import { useSessionStore } from "./hooks/useSessionStore";
import { Play, ArrowRight, ShieldAlert, Sparkles, Activity, Layers } from "lucide-react";
import { api } from "./services/api";

export function App() {
  const { session, setSession, clearSession } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Flow State
  const [viewingScore, setViewingScore] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [graphTab, setGraphTab] = useState<"console" | "graph">("console");

  const phase = session?.phase || "initial";

  const handleStartNew = async () => {
    setLoading(true);
    setError(null);
    try {
      const newSession = await api.createSession(label.trim() || undefined);
      setSession(newSession);
      setViewingScore(false);
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
      setViewingScore(true);
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
      if (restored.answered >= 5 && restored.phase === "diagnostic") {
        setViewingScore(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Session not found");
    } finally {
      setLoading(false);
    }
  };

  const handleDebugLearning = async () => {
    if (!session) return;
    setIsDebugging(true);
    setError(null);
    try {
      await api.runDebug(session.session_id);
      const updated = await api.getSession(session.session_id);
      setSession(updated);
      setViewingScore(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run debug analysis");
    } finally {
      setIsDebugging(false);
    }
  };

  const handleStartRepair = async () => {
    if (!session) return;
    setIsRepairing(true);
    try {
      await api.startRepair(session.session_id, 3);
      const updated = await api.getSession(session.session_id);
      setSession(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start repair");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleFinishRepair = async () => {
    if (!session) return;
    try {
      await api.reverify(session.session_id);
      const updated = await api.getSession(session.session_id);
      setSession(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reverify");
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#F3F3F4] flex flex-col font-sans">
      <Navbar 
        phase={viewingScore ? "diagnostic" : phase} 
        sessionId={session?.session_id || null} 
        onReset={() => {
          clearSession();
          setViewingScore(false);
        }} 
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
        {phase === "initial" && (
          <div className="max-w-3xl mx-auto w-full text-center py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A2A2F] border border-[#35353B] text-xs font-mono text-[#9E9EA7] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#D00000] animate-pulse" />
              <span>DIAGNOSTIC INSTRUMENTATION</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-display font-bold tracking-tight text-[#F3F3F4] mb-6">
              DEBUG YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D00000] via-[#6A040F] to-[#F3F3F4]">
                CONCEPT DEBT
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#9E9EA7] max-w-xl mx-auto mb-10 leading-relaxed font-sans">
              Traditional scores only report symptoms. We trace cascading errors backwards through the mathematics prerequisite graph to expose the foundational bug.
            </p>

            {/* Quick Actions Grid */}
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left mb-8">
              {/* Start Card */}
              <div className="p-6 rounded-2xl bg-[#2A2A2F] border border-[#35353B] hover:border-[#6A040F] transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#0E0E10] border border-[#35353B] flex items-center justify-center mb-4">
                    <Play className="w-5 h-5 text-[#F3F3F4]" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-[#F3F3F4] mb-1">
                    Start Diagnostic
                  </h3>
                  <p className="text-xs text-[#9E9EA7] mb-4">
                    13 foundational algebra problems to benchmark and isolate misconceptions.
                  </p>
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
                  <span>{loading ? "Starting..." : "Begin Diagnostic"}</span>
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
                    Instant pre-answered session (Alex, 46% symptom). Jump straight into root cause isolation and graph.
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
        {phase === "diagnostic" && !viewingScore && (
          <DiagnosticView
            session={session!}
            onComplete={() => setViewingScore(true)}
            onSessionUpdate={(s) => setSession(s)}
          />
        )}

        {/* 3. SYMPTOM SCORE VIEW */}
        {phase === "diagnostic" && viewingScore && (
          <ScoreView
            session={session!}
            onBackToTest={() => setViewingScore(false)}
            onStartDebug={handleDebugLearning}
            isDebugging={isDebugging}
          />
        )}

        {/* 4. DEBUGGED CONSOLE & GRAPH VIEW */}
        {phase === "debugged" && (
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

              <span className="text-xs font-mono text-[#9E9EA7] hidden sm:inline">
                SESSION: {session!.session_id.slice(0, 8)}...
              </span>
            </div>

            {graphTab === "console" ? (
              <DebugConsole
                session={session!}
                onStartRepair={handleStartRepair}
                isRepairing={isRepairing}
              />
            ) : (
              <div className="space-y-4">
                <ConceptGraph sessionId={session!.session_id} />
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
        {phase === "repair" && (
          <RepairView
            session={session!}
            onFinishRepair={handleFinishRepair}
            onBackToDebugger={() => {
              setSession({ ...session!, phase: "debugged" });
            }}
          />
        )}

        {/* 6. REVERIFY & REGRESSION RESULTS */}
        {phase === "done" && (
          <ReverifyView
            session={session!}
            onNewSession={() => {
              clearSession();
              setViewingScore(false);
            }}
            onInspectDebugger={() => {
              setSession({ ...session!, phase: "debugged" });
            }}
          />
        )}
      </main>

      <footer className="border-t border-[#35353B] py-4 text-center text-xs text-[#9E9EA7]">
        <span>Concept Debt · Diagnostic Engine & Knowledge Graph</span>
      </footer>
    </div>
  );
}
export default App;
