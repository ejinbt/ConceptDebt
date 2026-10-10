import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  TrendingDown, 
  ArrowDownRight, 
  RotateCcw, 
  Loader2, 
  Layers, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { api } from "../services/api";
import { ConceptGraph } from "./ConceptGraph";
import type { ReverifyOut, SessionOut } from "../types/api";

interface ReverifyViewProps {
  session: SessionOut;
  onNewSession: () => void;
  onInspectDebugger: () => void;
}

export function ReverifyView({ session, onNewSession, onInspectDebugger }: ReverifyViewProps) {
  const [reverifyData, setReverifyData] = useState<ReverifyOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.reverify(session.session_id)
      .then((data) => {
        if (mounted) {
          setReverifyData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to run reverify test");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [session.session_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm font-mono text-[#F3F3F4]">RUNNING REGRESSION TEST ACROSS CONCEPT GRAPH...</p>
        <p className="text-xs text-[#9E9EA7] mt-1 font-mono">Recomputing propagation weights and debt reduction delta</p>
      </div>
    );
  }

  if (error || !reverifyData) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#2A2A2F] border border-[#6A040F] text-center my-8">
        <p className="text-xs text-[#9E9EA7] mb-4">{error || "Could not complete reverification"}</p>
        <button
          onClick={onInspectDebugger}
          className="px-4 py-2 rounded-xl bg-[#35353B] text-xs font-semibold text-[#F3F3F4]"
        >
          Return to Debugger
        </button>
      </div>
    );
  }

  const rootDrop = reverifyData.root_before - reverifyData.root_after;

  // Dynamic wording based on actual debt results
  let badgeText = "REGRESSION TEST PASSED · DEBT SIGNIFICANTLY REDUCED";
  let badgeBorder = "border-emerald-800 text-emerald-300 bg-emerald-950";
  let headline = "Root Concept Healed";

  if (reverifyData.root_after <= 25 || rootDrop >= 50) {
    badgeText = "REGRESSION TEST PASSED · DEBT SIGNIFICANTLY REDUCED";
    headline = "Root Concept Healed";
  } else if (rootDrop > 0) {
    badgeText = "PARTIAL RECOVERY · DEBT REDUCED";
    headline = "Concept Debt Decreased";
    badgeBorder = "border-amber-800 text-amber-300 bg-amber-950/60";
  } else {
    badgeText = "FURTHER PRACTICE RECOMMENDED";
    headline = "Debt Remains Elevated";
    badgeBorder = "border-[#6A040F] text-rose-300 bg-[#6A040F]/30";
  }

  return (
    <div className="w-full space-y-6">
      {/* Hero Headline Diff Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#2A2A2F] border border-emerald-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-semibold uppercase mb-3 ${badgeBorder}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{badgeText}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-display font-bold text-[#F3F3F4] tracking-tight">
              {headline}
            </h2>

            <p className="text-xs sm:text-sm text-[#9E9EA7] mt-2 font-mono">
              {reverifyData.repair_correct} of {reverifyData.repair_answered} repair drills answered correctly. Downstream concepts stabilized automatically.
            </p>
          </div>

          {/* Large Before -> After Diff Box */}
          <div className="p-5 rounded-2xl bg-[#0E0E10] border border-[#35353B] flex items-center gap-6">
            <div className="text-left">
              <div className="text-[10px] font-mono text-[#9E9EA7] uppercase">Initial Debt</div>
              <div className="text-3xl font-display font-bold text-[#D00000]">
                {reverifyData.root_before.toFixed(1)}%
              </div>
            </div>

            <div className="text-[#9E9EA7]">
              <ArrowRight className="w-6 h-6 text-emerald-400" />
            </div>

            <div className="text-left">
              <div className="text-[10px] font-mono text-[#9E9EA7] uppercase">Post-Repair Debt</div>
              <div className="text-3xl font-display font-bold text-emerald-400">
                {reverifyData.root_after.toFixed(1)}%
              </div>
            </div>

            <div className="border-l border-[#35353B] pl-4 text-left">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Net Reduction</div>
              <div className="text-2xl font-display font-bold text-emerald-400">
                -{rootDrop.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Downstream Cascading Improvements Table */}
      <div className="rounded-3xl bg-[#2A2A2F] border border-[#35353B] p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-display font-bold text-[#F3F3F4]">
              Downstream Prerequisite Healing
            </h3>
            <p className="text-xs text-[#9E9EA7]">
              These later concepts saw their debt automatically decrease without practicing them directly.
            </p>
          </div>

          <span className="text-xs font-mono text-[#9E9EA7]">
            {reverifyData.changes.length} CONCEPTS HEALED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[#35353B] text-[#9E9EA7] font-mono text-[11px]">
                <th className="pb-3 font-semibold uppercase">Concept</th>
                <th className="pb-3 font-semibold uppercase">Before Repair</th>
                <th className="pb-3 font-semibold uppercase">After Repair</th>
                <th className="pb-3 font-semibold uppercase text-right">Debt Reduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#35353B]">
              {reverifyData.changes.map((item) => (
                <tr key={item.concept_id} className="hover:bg-[#1A1A1E] transition-colors">
                  <td className="py-3 font-semibold text-sm text-[#F3F3F4]">
                    {item.name}
                  </td>
                  <td className="py-3 font-mono text-[#D00000]">
                    {item.before.toFixed(1)}%
                  </td>
                  <td className="py-3 font-mono text-emerald-400">
                    {item.after.toFixed(1)}%
                  </td>
                  <td className="py-3 font-mono font-bold text-right text-emerald-400">
                    <span className="inline-flex items-center gap-1 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>{item.change.toFixed(1)}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post-Repair Knowledge Graph */}
      <div>
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-mono text-[#9E9EA7] uppercase">
            Updated Post-Repair Knowledge Graph
          </span>
          <button
            onClick={() => setShowGraph(!showGraph)}
            className="text-xs font-mono text-[#9E9EA7] hover:text-[#F3F3F4]"
          >
            {showGraph ? "Hide Graph" : "Show Graph"}
          </button>
        </div>
        {showGraph && <ConceptGraph sessionId={session.session_id} />}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={onInspectDebugger}
          className="px-6 py-3 rounded-xl bg-[#2A2A2F] hover:bg-[#35353B] border border-[#35353B] text-xs font-semibold text-[#F3F3F4] transition-colors"
        >
          Review Full Debugger
        </button>

        <button
          onClick={onNewSession}
          className="px-8 py-3 rounded-xl bg-[#F3F3F4] hover:bg-white text-[#0E0E10] text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start New Student Session</span>
        </button>
      </div>
    </div>
  );
}
