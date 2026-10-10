import { useState, useEffect } from "react";
import { Activity, Radio, Cpu, RotateCcw, GraduationCap } from "lucide-react";
import { api } from "../services/api";
import type { HealthOut, Phase } from "../types/api";

interface NavbarProps {
  phase: Phase | "initial";
  sessionId: string | null;
  grade?: number;
  onReset: () => void;
}

export function Navbar({ phase, sessionId, grade, onReset }: NavbarProps) {
  const [health, setHealth] = useState<HealthOut | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const steps: { key: Phase | "initial"; label: string; num: string }[] = [
    { key: "initial", label: "START", num: "01" },
    { key: "diagnostic", label: "DIAGNOSTIC", num: "02" },
    { key: "debugged", label: "DEBUG & GRAPH", num: "03" },
    { key: "repair", label: "REPAIR", num: "04" },
    { key: "done", label: "VERIFIED", num: "05" },
  ];

  return (
    <header className="border-b border-[#35353B] bg-[#0E0E10]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img 
            src="/Assets/logo.png" 
            alt="Concept Debt Logo" 
            className="w-9 h-9 rounded-lg object-contain bg-[#0E0E10] border border-[#35353B] shadow-sm"
          />
          <div>
            <span className="font-display font-bold text-lg tracking-wider text-[#F3F3F4]">
              CONCEPT<span className="text-[#D00000]">_DEBT</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-[#2A2A2F] text-[#9E9EA7]">
              v1.0
            </span>
          </div>
        </div>

        {/* Phase Timeline Stepper */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#2A2A2F]/50 p-1 rounded-full border border-[#35353B]">
          {steps.map((s, idx) => {
            const isActive = phase === s.key;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                  isActive
                    ? "bg-[#6A040F] text-[#F3F3F4] font-semibold shadow-sm"
                    : "text-[#9E9EA7] hover:text-[#F3F3F4]"
                }`}
              >
                <span className={`text-[10px] font-mono ${isActive ? "text-[#D00000]" : "text-[#9E9EA7]"}`}>
                  {s.num}
                </span>
                <span>{s.label}</span>
                {idx < steps.length - 1 && (
                  <span className="text-[#35353B] ml-1">/</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Status Indicators & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {grade && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#6A040F]/40 border border-[#D00000]/30 text-xs font-mono text-[#F3F3F4]">
              <GraduationCap className="w-3.5 h-3.5 text-[#D00000]" />
              <span>Class {grade}</span>
            </div>
          )}

          {sessionId && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#2A2A2F] border border-[#35353B] text-xs font-mono text-[#9E9EA7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D00000] animate-pulse" />
              <span>{sessionId.slice(0, 8)}...</span>
              <button
                onClick={onReset}
                title="End session"
                className="hover:text-[#F3F3F4] transition-colors ml-1"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* AI / Backend Status */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#2A2A2F] border border-[#35353B] text-xs">
            <Radio className={`w-3 h-3 ${health?.status === "ok" ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="text-[#9E9EA7] hidden sm:inline">
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
        </div>
      </div>
    </header>
  );
}
