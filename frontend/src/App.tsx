import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { useSessionStore } from "./hooks/useSessionStore";
import { Activity, Play, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { api } from "./services/api";

export function App() {
  const { session, setSession, clearSession } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const phase = session?.phase || "initial";

  const handleStartNew = async () => {
    setLoading(true);
    setError(null);
    try {
      const newSession = await api.createSession(label.trim() || undefined);
      setSession(newSession);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Session not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#F3F3F4] flex flex-col font-sans">
      <Navbar phase={phase} sessionId={session?.session_id || null} onReset={clearSession} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {/* Error notification */}
        {error && (
          <div className="mb-6 max-w-xl mx-auto w-full p-4 rounded-xl bg-[#6A040F]/30 border border-[#D00000] flex items-center gap-3 text-sm text-[#F3F3F4]">
            <ShieldAlert className="w-5 h-5 text-[#D00000] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Phase: Initial Landing */}
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
                    className="w-full bg-[#0E0E10] border border-[#35353B] rounded-lg px-3 py-2 text-xs text-[#F3F3F4] focus:outline-none focus:border-[#D00000] mb-4"
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

        {/* Placeholder when session is active (ready for Phase 2 & 3) */}
        {phase !== "initial" && (
          <div className="max-w-xl mx-auto text-center py-12 p-8 rounded-2xl bg-[#2A2A2F] border border-[#35353B]">
            <div className="w-12 h-12 rounded-xl bg-[#6A040F] text-[#F3F3F4] flex items-center justify-center mx-auto mb-4">
              <Activity className="w-6 h-6 text-[#D00000]" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#F3F3F4] mb-2">
              Active Phase: {phase.toUpperCase()}
            </h2>
            <p className="text-xs text-[#9E9EA7] font-mono mb-6">
              Session ID: {session?.session_id}
            </p>
            <button
              onClick={clearSession}
              className="px-4 py-2 rounded-lg bg-[#35353B] hover:bg-[#6A040F] text-xs text-[#F3F3F4] font-semibold transition-colors"
            >
              Reset Session
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-[#35353B] py-4 text-center text-xs text-[#9E9EA7]">
        <span>Concept Debt · Diagnostic Engine & Knowledge Graph</span>
      </footer>
    </div>
  );
}
export default App;
