import { useState, useEffect } from "react";
import { Radio, Cpu, RotateCcw, GraduationCap, Menu, X, ArrowUpRight } from "lucide-react";
import { api } from "../services/api";
import type { HealthOut, Phase } from "../types/api";

export type NavView = "initial" | "diagnostic" | "score" | "debugged" | "repair" | "done";

interface NavbarProps {
  currentView: NavView;
  sessionPhase: Phase | "initial";
  sessionId: string | null;
  grade?: number;
  onNavigate: (view: NavView) => void;
  onReset: () => void;
  onGoHome: () => void;
}

export function Navbar({
  currentView,
  sessionPhase,
  sessionId,
  grade,
  onNavigate,
  onReset,
  onGoHome,
}: NavbarProps) {
  const [health, setHealth] = useState<HealthOut | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  // Compute what phases are unlocked based on session progress
  const isPhaseUnlocked = (view: NavView): boolean => {
    if (view === "initial") return true;
    if (!sessionId) return false;
    if (view === "diagnostic") return true;
    if (view === "score") return true;
    if (view === "debugged") return sessionPhase === "debugged" || sessionPhase === "repair" || sessionPhase === "done";
    if (view === "repair") return sessionPhase === "repair" || sessionPhase === "done";
    if (view === "done") return sessionPhase === "done";
    return false;
  };

  const steps: { key: NavView; label: string; num: string }[] = [
    { key: "initial", label: "START", num: "01" },
    { key: "diagnostic", label: "DIAGNOSTIC", num: "02" },
    { key: "debugged", label: "DEBUG & GRAPH", num: "03" },
    { key: "repair", label: "REPAIR", num: "04" },
    { key: "done", label: "VERIFIED", num: "05" },
  ];

  return (
    <>
      {/* Floating Glassmorphic Pill Header */}
      <header className="sticky top-4 inset-x-0 z-50 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="bg-[#141418]/80 backdrop-blur-xl border border-[#35353B]/80 rounded-2xl shadow-2xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4 transition-all">
          {/* Brand & Home clickable */}
          <button
            onClick={onGoHome}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity text-left cursor-pointer group"
            title="Return to Start / Home"
          >
            <div className="relative">
              <img
                src="/Assets/logo.png"
                alt="Concept Debt Logo"
                className="w-9 h-9 rounded-xl object-contain bg-[#0E0E10] border border-[#35353B] group-hover:border-[#D00000] shadow-sm transition-colors"
              />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D00000] ring-2 ring-[#0E0E10]" />
            </div>
            <div>
              <span className="font-display font-black text-lg tracking-wider text-[#F3F3F4]">
                CONCEPT<span className="text-[#D00000]">_DEBT</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] tracking-widest font-mono uppercase px-2 py-0.5 rounded-full bg-[#2A2A2F] text-[#9E9EA7] border border-[#35353B]">
                STUDIO V1.0
              </span>
            </div>
          </button>

          {/* Phase Timeline Stepper - Interactive for unlocked stages */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#0E0E10]/80 p-1.5 rounded-full border border-[#35353B]">
            {steps.map((s, idx) => {
              const isActive = currentView === s.key || (s.key === "diagnostic" && currentView === "score");
              const unlocked = isPhaseUnlocked(s.key);

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => unlocked && onNavigate(s.key)}
                  disabled={!unlocked}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                    isActive
                      ? "bg-[#6A040F] text-[#F3F3F4] font-bold shadow-md shadow-[#6A040F]/40 border border-[#D00000]/50 cursor-default"
                      : unlocked
                      ? "text-[#9E9EA7] hover:text-[#F3F3F4] hover:bg-[#2A2A2F] cursor-pointer"
                      : "text-[#5B6275] opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className={`text-[10px] ${isActive ? "text-[#D00000] font-bold" : "text-inherit"}`}>
                    {s.num}
                  </span>
                  <span>{s.label}</span>
                  {idx < steps.length - 1 && (
                    <span className="text-[#35353B] ml-1 select-none">/</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action & Status Group */}
          <div className="flex items-center gap-2 sm:gap-3">
            {grade && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#6A040F]/40 border border-[#D00000]/40 text-xs font-mono text-[#F3F3F4]">
                <GraduationCap className="w-3.5 h-3.5 text-[#D00000]" />
                <span>Class {grade}</span>
              </div>
            )}

            {sessionId && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E0E10] border border-[#35353B] text-xs font-mono text-[#9E9EA7]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D00000] animate-pulse" />
                <span className="hidden sm:inline">{sessionId.slice(0, 8)}</span>
                <button
                  onClick={onReset}
                  title="End session and start fresh"
                  className="hover:text-[#F3F3F4] text-xs flex items-center gap-1 transition-colors ml-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-[#D00000]" />
                  <span className="text-[10px] uppercase font-mono">End</span>
                </button>
              </div>
            )}

            {/* AI / Backend Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E0E10] border border-[#35353B] text-xs font-mono">
              <Radio className={`w-3 h-3 ${health?.status === "ok" ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="text-[#9E9EA7]">
                {health?.ai_enabled ? (
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-[#D00000]" />
                    <span>Qwen 2.5</span>
                  </span>
                ) : (
                  "Rules Mode"
                )}
              </span>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#2A2A2F] text-[#F3F3F4] border border-[#35353B] hover:bg-[#35353B]"
              aria-label="Toggle navigation drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0E0E10]/95 backdrop-blur-2xl flex flex-col justify-between p-8 pt-24 lg:hidden">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-mono uppercase tracking-widest text-[#9E9EA7]">
              NAVIGATION PHASES
            </span>
            <div className="flex flex-col gap-3">
              {steps.map((s) => {
                const isActive = currentView === s.key;
                const unlocked = isPhaseUnlocked(s.key);
                return (
                  <button
                    key={s.key}
                    disabled={!unlocked}
                    onClick={() => {
                      if (unlocked) {
                        onNavigate(s.key);
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={`p-4 rounded-xl text-left font-display font-bold text-xl uppercase flex items-center justify-between border transition-all ${
                      isActive
                        ? "bg-[#6A040F] text-[#F3F3F4] border-[#D00000]"
                        : unlocked
                        ? "bg-[#1A1A1E] text-[#F3F3F4] border-[#35353B]"
                        : "bg-[#0E0E10] text-[#5B6275] border-[#2A2A2F] opacity-40"
                    }`}
                  >
                    <span>
                      <span className="font-mono text-sm text-[#D00000] mr-3">{s.num}</span>
                      {s.label}
                    </span>
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-[#35353B] flex items-center justify-between text-xs font-mono text-[#9E9EA7]">
            <span>CONCEPT DEBT // STUDIO ENGINE</span>
            {sessionId && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onReset();
                }}
                className="text-[#D00000] underline"
              >
                Reset Session
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
