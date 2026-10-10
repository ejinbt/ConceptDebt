import { useState, useEffect } from "react";
import { ArrowLeft, Activity, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { api } from "../services/api";
import type { ScoreOut, SessionOut } from "../types/api";

interface ScoreViewProps {
  session: SessionOut;
  onBackToTest: () => void;
  onStartDebug: () => void;
  isDebugging: boolean;
}

export function ScoreView({ session, onBackToTest, onStartDebug, isDebugging }: ScoreViewProps) {
  const [scoreData, setScoreData] = useState<ScoreOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getScore(session.session_id)
      .then((data) => {
        if (mounted) {
          setScoreData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load score");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [session.session_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="w-8 h-8 text-[#D00000] animate-spin mb-4" />
        <p className="text-sm font-mono text-[#9E9EA7]">COMPUTING ASSESSMENT BENCHMARK...</p>
      </div>
    );
  }

  if (error || !scoreData) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#2A2A2F] border border-[#6A040F] text-center my-12">
        <p className="text-xs text-[#9E9EA7] mb-4">{error || "Could not retrieve score"}</p>
        <button
          onClick={onBackToTest}
          className="px-4 py-2 rounded-lg bg-[#35353B] text-xs font-semibold text-[#F3F3F4]"
        >
          Return to Test
        </button>
      </div>
    );
  }

  const roundedPct = Math.round(scoreData.percent);
  const mistakes = scoreData.answered - scoreData.correct;

  return (
    <div className="max-w-2xl mx-auto w-full py-8 text-center">
      {/* Eyebrow Label */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A2A2F] border border-[#35353B] text-xs font-mono text-[#9E9EA7] mb-8">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span>SURFACE ASSESSMENT SYMPTOM</span>
      </div>

      {/* Hero Score Display */}
      <div className="p-10 rounded-3xl bg-[#2A2A2F] border border-[#35353B] shadow-2xl relative overflow-hidden mb-8">
        <div className="text-xs font-mono text-[#9E9EA7] tracking-widest uppercase mb-4">
          Diagnostic Score
        </div>

        <div className="text-7xl sm:text-9xl font-display font-bold text-[#F3F3F4] tracking-tight mb-4">
          {roundedPct}%
        </div>

        <p className="text-sm font-mono text-[#9E9EA7] mb-6">
          {scoreData.correct} OF {scoreData.answered} QUESTIONS ANSWERED CORRECTLY · {mistakes} ERRORS RECORDED
        </p>

        {/* Narrative Callout */}
        <div className="p-4 rounded-xl bg-[#0E0E10] border border-[#35353B] text-xs text-[#9E9EA7] max-w-lg mx-auto leading-relaxed">
          Standard grading stops here. But a <span className="text-[#F3F3F4] font-semibold">{roundedPct}%</span> score is only a <span className="text-amber-400 font-semibold">symptom</span>. Multiple errors often originate from an unlearned prerequisite deeper in the knowledge graph.
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onBackToTest}
          className="px-5 py-3 rounded-xl bg-[#2A2A2F] hover:bg-[#35353B] border border-[#35353B] text-xs font-semibold text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Review Questions</span>
        </button>

        <button
          onClick={onStartDebug}
          disabled={isDebugging}
          className="px-8 py-3 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-[#F3F3F4] tracking-wider uppercase transition-all shadow-xl shadow-[#6A040F]/30 flex items-center gap-2 border border-[#D00000]/40"
        >
          {isDebugging ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Tracing Root Cause...</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-[#F3F3F4]" />
              <span>Debug Learning (Find Root Cause)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
