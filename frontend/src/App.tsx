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
import { 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  Layers, 
  GraduationCap, 
  GitBranch, 
  CheckCircle2, 
  Lock, 
  Compass, 
  ChevronRight
} from "lucide-react";
import { api } from "./services/api";
import type { ClassItem } from "./types/api";

// Studio Engine Components
import { initSmoothScroll } from "./components/studio/SmoothScroll";
import { StudioLoader } from "./components/studio/StudioLoader";
import { MagneticHeading } from "./components/studio/MagneticHeading";
import { VelocityMarquee } from "./components/studio/VelocityMarquee";
import { KineticManifesto } from "./components/studio/KineticManifesto";
import { CardTilt3D } from "./components/studio/CardTilt3D";
import { PillBadge } from "./components/studio/PillBadge";

export function App() {
  const { session, setSession, savedView, updateView, clearSession } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize Lenis smooth scroll on mount
  useEffect(() => {
    initSmoothScroll();
  }, []);

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
      if (restored.phase === "done") {
        setUseReadOnlyDebt(true);
        setCurrentView("done");
      } else if (restored.phase === "repair") setCurrentView("repair");
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
    <div className="min-h-screen bg-[#0E0E10] text-[#F3F3F4] flex flex-col font-sans selection:bg-[#D00000] selection:text-white">
      {/* Studio Entrance Loader with Serpentine Stroke */}
      <StudioLoader />

      <Navbar 
        currentView={currentView}
        sessionPhase={session?.phase || "initial"}
        sessionId={session?.session_id || null}
        grade={session?.grade}
        onNavigate={(view) => setCurrentView(view)}
        onReset={() => setConfirmResetOpen(true)}
        onGoHome={handleGoHome}
      />

      <main className="flex-1 w-full mx-auto flex flex-col justify-center">
        {/* Error notification */}
        {error && (
          <div className="my-6 max-w-xl mx-auto w-full p-4 rounded-2xl bg-[#6A040F]/30 border border-[#D00000] flex items-center gap-3 text-sm text-[#F3F3F4]">
            <ShieldAlert className="w-5 h-5 text-[#D00000] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. INITIAL LANDING SCREEN — BOUTIQUE STUDIO ARCHITECTURE */}
        {currentView === "initial" && (
          <div className="w-full flex flex-col items-center">
            {/* Hero Viewport */}
            <section className="min-h-[82vh] flex flex-col justify-center items-center px-4 sm:px-8 py-12 max-w-5xl mx-auto w-full text-center relative">
              {/* If a session is already in progress, show active resume banner */}
              {session && (
                <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-[#141418] border border-[#6A040F] flex flex-wrap items-center justify-between gap-4 text-left max-w-2xl w-full shadow-2xl">
                  <div>
                    <div className="text-[11px] font-mono text-[#D00000] font-bold uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D00000] animate-pulse" />
                      <span>SESSION IN PROGRESS</span>
                    </div>
                    <div className="text-sm font-semibold text-[#F3F3F4] mt-1 font-display">
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
                      className="px-4 py-2 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-white transition-all shadow-md shadow-[#6A040F]/30 cursor-pointer"
                    >
                      Continue Session →
                    </button>
                    <button
                      onClick={() => setConfirmResetOpen(true)}
                      className="px-3 py-2 rounded-xl bg-[#0E0E10] hover:bg-[#2A2A2F] text-xs font-mono text-[#9E9EA7] transition-colors border border-[#35353B] cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {/* Angled Pill Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <PillBadge angle={1} variant="crimson">
                  <span>NCERT CURRICULUM LEVEL 0-5</span>
                </PillBadge>
                <PillBadge angle={2} variant="surface">
                  <span>QWEN 2.5 MISCONCEPTION CLASSIFIER</span>
                </PillBadge>
                <PillBadge angle={3} variant="emerald">
                  <span>CASCADE PREREQUISITE HEALING</span>
                </PillBadge>
              </div>

              {/* Magnetic Dual-Layer Physics Heading */}
              <MagneticHeading
                line1="DEBUG YOUR"
                line2="CONCEPT DEBT"
              />

              <p className="text-base sm:text-xl text-[#9E9EA7] max-w-2xl mx-auto mb-12 leading-relaxed font-sans">
                Traditional exam scores only report symptoms. We trace recurring algebra mistakes backwards through the prerequisite knowledge graph to isolate the exact foundational bug.
              </p>

              {/* 3D Perspective Cards Grid */}
              <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto w-full text-left mb-10">
                {/* 3D Tilt Card 1: Start Diagnostic */}
                <CardTilt3D>
                  <div className="p-7 rounded-3xl bg-[#141418] border border-[#35353B] hover:border-[#6A040F] transition-all flex flex-col justify-between h-full shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D00000]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#D00000]/10 transition-colors" />

                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#0E0E10] border border-[#35353B] flex items-center justify-center mb-5 group-hover:border-[#D00000] transition-colors">
                        <GraduationCap className="w-6 h-6 text-[#F3F3F4]" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-[#F3F3F4] mb-1">
                        Start Diagnostic
                      </h3>
                      <p className="text-xs text-[#9E9EA7] mb-5 leading-relaxed font-sans">
                        Select your NCERT class to test aligned curriculum prerequisites and find hidden debt.
                      </p>

                      {/* NCERT Class Picker Button Group */}
                      <div className="mb-5">
                        <label className="block text-[11px] font-mono text-[#9E9EA7] uppercase mb-2 tracking-wider">
                          Select Class / Grade
                        </label>
                        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#0E0E10] border border-[#35353B]">
                          {(availableClasses.length > 0 ? availableClasses : [
                            { grade: 8, label: "Class 8", questions: 12 },
                            { grade: 9, label: "Class 9", questions: 12 },
                            { grade: 10, label: "Class 10", questions: 15 },
                          ]).map((item) => (
                            <button
                              key={item.grade}
                              type="button"
                              onClick={() => setSelectedGrade(item.grade)}
                              className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                selectedGrade === item.grade
                                  ? "bg-[#6A040F] text-[#F3F3F4] border border-[#D00000]/50 shadow-md shadow-[#6A040F]/30"
                                  : "text-[#9E9EA7] hover:text-[#F3F3F4] hover:bg-[#1A1A1E]"
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
                        className="w-full bg-[#0E0E10] border border-[#35353B] rounded-xl px-3.5 py-2.5 text-xs text-[#F3F3F4] focus:outline-none focus:border-[#D00000] mb-5 font-mono"
                      />
                    </div>

                    <button
                      disabled={loading}
                      onClick={handleStartNew}
                      className="w-full py-3.5 rounded-xl bg-[#F3F3F4] hover:bg-white text-[#0E0E10] font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.01]"
                    >
                      <span>{loading ? "Initializing..." : `Begin Class ${selectedGrade} Benchmark`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </CardTilt3D>

                {/* 3D Tilt Card 2: Demo Student (Alex) */}
                <CardTilt3D>
                  <div className="p-7 rounded-3xl bg-[#141418] border border-[#35353B] hover:border-[#D00000]/60 transition-all flex flex-col justify-between h-full shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-4 right-4">
                      <PillBadge angle={2} variant="maroon">
                        <span>EVALUATOR SHORTCUT</span>
                      </PillBadge>
                    </div>

                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#6A040F]/30 border border-[#D00000]/40 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-6 h-6 text-[#D00000]" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-[#F3F3F4] mb-1">
                        Load Demo Student
                      </h3>
                      <p className="text-xs text-[#9E9EA7] mb-5 leading-relaxed font-sans">
                        Pre-answered Class 10 diagnostic session (Alex, 53% symptom score). Jump straight into root cause isolation and graph topology.
                      </p>

                      <div className="p-3.5 rounded-2xl bg-[#0E0E10] border border-[#35353B] mb-5 font-mono text-[11px] text-[#9E9EA7] space-y-1">
                        <div className="flex justify-between">
                          <span>STUDENT:</span>
                          <span className="text-[#F3F3F4] font-bold">Alex (Class 10)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SYMPTOM:</span>
                          <span className="text-amber-400 font-bold">53% Surface Score</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ROOT BOTTLENECK:</span>
                          <span className="text-[#D00000] font-bold">Distributive Property</span>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={loading}
                      onClick={handleLoadDemo}
                      className="w-full py-3.5 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-[#F3F3F4] font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-[#D00000]/40 cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.01]"
                    >
                      <span>{loading ? "Loading..." : "Load Alex Demo Scenario"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </CardTilt3D>
              </div>

              {/* Resume Session Bar */}
              <div className="max-w-xl mx-auto w-full flex items-center gap-2 p-2 rounded-2xl bg-[#141418] border border-[#35353B] focus-within:border-[#6A040F] transition-colors shadow-lg">
                <Compass className="w-4 h-4 text-[#9E9EA7] ml-2 shrink-0" />
                <input
                  type="text"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  placeholder="Paste an existing session ID to resume..."
                  className="flex-1 bg-transparent px-2 py-1.5 text-xs text-[#F3F3F4] focus:outline-none font-mono"
                />
                <button
                  onClick={handleResume}
                  disabled={loading || !resumeId.trim()}
                  className="px-5 py-2 rounded-xl bg-[#2A2A2F] hover:bg-[#35353B] text-xs font-semibold text-[#F3F3F4] transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Resume
                </button>
              </div>
            </section>

            {/* Velocity-Reactive Dual Marquee */}
            <VelocityMarquee />

            {/* Pinned Kinetic Scroll-Scrub Manifesto */}
            <KineticManifesto />

            {/* Asymmetric Editorial Chapter: Curriculum Architecture (7 / 5 split) */}
            <section className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-[#35353B] select-none">
              <div className="flex flex-col lg:flex-row gap-12 items-start justify-between">
                {/* Left 7 cols: Editorial Lead */}
                <div className="w-full lg:w-7/12 space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#D00000] font-bold">
                      01 / TOPOLOGICAL ARCHITECTURE
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-display font-black uppercase tracking-tight text-[#F3F3F4] leading-[1.05]">
                    THE PREREQUISITE CASCADE MATRIX
                  </h2>

                  <p className="text-sm sm:text-base text-[#9E9EA7] leading-relaxed font-sans">
                    Most students who struggle with Quadratic Factorisation in Class 10 aren't failing Quadratics. They have unresolved debt in Level 1 Negative Signs or Level 2 Distributive Property from Class 8.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                    <div className="p-4 rounded-2xl bg-[#141418] border border-[#35353B]">
                      <div className="text-[10px] font-mono uppercase text-[#9E9EA7]">Prerequisites</div>
                      <div className="text-2xl font-display font-bold text-[#F3F3F4] mt-1">14 Concepts</div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-1">Levels 0 to 5</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#141418] border border-[#35353B]">
                      <div className="text-[10px] font-mono uppercase text-[#9E9EA7]">Detection Model</div>
                      <div className="text-2xl font-display font-bold text-[#F3F3F4] mt-1">Qwen 2.5</div>
                      <div className="text-[10px] font-mono text-[#D00000] mt-1">AI Misconceptions</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#141418] border border-[#35353B] col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-mono uppercase text-[#9E9EA7]">Curriculum</div>
                      <div className="text-2xl font-display font-bold text-[#F3F3F4] mt-1">NCERT</div>
                      <div className="text-[10px] font-mono text-amber-400 mt-1">Class 8, 9 & 10</div>
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Structured Level Ladder */}
                <div className="w-full lg:w-5/12 bg-[#141418] p-6 rounded-3xl border border-[#35353B] space-y-3">
                  <div className="text-xs font-mono uppercase tracking-widest text-[#9E9EA7] pb-2 border-b border-[#35353B] flex justify-between">
                    <span>PREREQUISITE DEPENDENCY TREE</span>
                    <span className="text-[#D00000]">FLOW</span>
                  </div>

                  {[
                    { lvl: "LVL 5", name: "Quadratic Equations", ncert: "Ch 4 · Class 10", status: "Cascaded Symptom" },
                    { lvl: "LVL 4", name: "Polynomial Expansion", ncert: "Ch 2 · Class 9", status: "Compounding Debt" },
                    { lvl: "LVL 3", name: "Algebraic Factorisation", ncert: "Ch 12 · Class 8", status: "Compounding Debt" },
                    { lvl: "LVL 2", name: "Distributive Property", ncert: "Ch 9 · Class 8", status: "PRIMARY ROOT CAUSE", isRoot: true },
                    { lvl: "LVL 1", name: "Linear Operations", ncert: "Ch 2 · Class 8", status: "Downstream Stabilized" },
                    { lvl: "LVL 0", name: "Fractions & Negatives", ncert: "Ch 1 · Class 7/8", status: "Foundational Anchor" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        item.isRoot
                          ? "bg-[#6A040F]/40 border-[#D00000] text-[#F3F3F4] shadow-md shadow-[#D00000]/20"
                          : "bg-[#0E0E10] border-[#35353B] text-[#9E9EA7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          item.isRoot ? "bg-[#D00000] text-white" : "bg-[#2A2A2F] text-[#9E9EA7]"
                        }`}>
                          {item.lvl}
                        </span>
                        <div>
                          <div className={`font-semibold font-display ${item.isRoot ? "text-white" : "text-[#F3F3F4]"}`}>
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#5B6275]">{item.ncert}</div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-mono uppercase ${
                        item.isRoot ? "text-[#D00000] font-bold" : "text-[#5B6275]"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 2. DIAGNOSTIC ASSESSMENT VIEW */}
        {currentView === "diagnostic" && session && (
          <div className="max-w-7xl w-full mx-auto px-4 py-8">
            <DiagnosticView
              session={session}
              onComplete={() => setCurrentView("score")}
              onSessionUpdate={(s) => setSession(s)}
              onExitTest={() => setConfirmExitTestOpen(true)}
            />
          </div>
        )}

        {/* 3. SYMPTOM SCORE VIEW */}
        {currentView === "score" && session && (
          <div className="max-w-7xl w-full mx-auto px-4 py-8">
            <ScoreView
              session={session}
              onBackToTest={() => setCurrentView("diagnostic")}
              onStartDebug={handleDebugLearning}
              isDebugging={isDebugging}
            />
          </div>
        )}

        {/* 4. DEBUGGED CONSOLE & GRAPH VIEW */}
        {currentView === "debugged" && session && (
          <div className="max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-[#35353B] pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGraphTab("console")}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    graphTab === "console"
                      ? "bg-[#6A040F] text-[#F3F3F4] border border-[#D00000]/40 shadow-md"
                      : "text-[#9E9EA7] hover:text-[#F3F3F4] hover:bg-[#2A2A2F]"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-[#D00000]" />
                  <span>ROOT CAUSE & STACK TRACE</span>
                </button>

                <button
                  onClick={() => setGraphTab("graph")}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    graphTab === "graph"
                      ? "bg-[#6A040F] text-[#F3F3F4] border border-[#D00000]/40 shadow-md"
                      : "text-[#9E9EA7] hover:text-[#F3F3F4] hover:bg-[#2A2A2F]"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#D00000]" />
                  <span>KNOWLEDGE GRAPH VIEW</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-[#9E9EA7]">
                <button
                  onClick={() => setCurrentView("score")}
                  className="hover:text-[#F3F3F4] underline cursor-pointer"
                >
                  ← Score Summary
                </button>
                {session.grade && <span className="hidden sm:inline">CLASS {session.grade}</span>}
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
                    className="px-8 py-3 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-[#F3F3F4] tracking-wider uppercase transition-all shadow-lg hover:shadow-xl cursor-pointer"
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
          <div className="max-w-7xl w-full mx-auto px-4 py-8">
            <RepairView
              session={session}
              onFinishRepair={handleFinishRepair}
              onBackToDebugger={() => setCurrentView("debugged")}
              onSessionUpdate={(s) => setSession(s)}
            />
          </div>
        )}

        {/* 6. REVERIFY & REGRESSION RESULTS */}
        {currentView === "done" && session && (
          <div className="max-w-7xl w-full mx-auto px-4 py-8">
            <ReverifyView
              session={session}
              onNewSession={() => setConfirmResetOpen(true)}
              onInspectDebugger={handleInspectDebugger}
              onSessionUpdate={(s) => setSession(s)}
            />
          </div>
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

      <footer className="border-t border-[#35353B] py-8 px-6 text-center text-xs text-[#9E9EA7] font-mono mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D00000]" />
            <span className="text-[#F3F3F4] font-bold">CONCEPT_DEBT</span>
            <span>· NCERT MATHEMATICS PREREQUISITE DEBUGGER</span>
          </div>
          <div>
            <span>BOUTIQUE STUDIO ENGINE // AWWARDS STANDARD MOTION PHYSICS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
