import { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  ArrowRight, 
  CheckCircle2, 
  GitBranch, 
  HelpCircle, 
  Layers, 
  TrendingDown, 
  Wrench, 
  Loader2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { api } from "../services/api";
import type { Analysis, SessionOut, ConceptDebt } from "../types/api";

interface DebugConsoleProps {
  session: SessionOut;
  onStartRepair: () => void;
  onSelectConcept?: (conceptId: string) => void;
  isRepairing?: boolean;
}

export function DebugConsole({ session, onStartRepair, onSelectConcept, isRepairing }: DebugConsoleProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.runDebug(session.session_id);
      setAnalysis(data);
      if (data.root) {
        setSelectedConceptId(data.root.concept_id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run root cause analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, [session.session_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-10 h-10 text-[#D00000] animate-spin mb-4" />
        <p className="text-sm font-mono text-[#F3F3F4]">TRACING PREREQUISITE DEPENDENCIES...</p>
        <p className="text-xs text-[#9E9EA7] mt-1 font-mono">Running Qwen 2.5 misconception classification & debt propagation</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-xl mx-auto p-6 rounded-2xl bg-[#2A2A2F] border border-[#6A040F] text-center my-8">
        <AlertOctagon className="w-8 h-8 text-[#D00000] mx-auto mb-3" />
        <h3 className="font-display font-semibold text-lg text-[#F3F3F4] mb-2">Analysis Failed</h3>
        <p className="text-xs text-[#9E9EA7] mb-4">{error || "Could not retrieve debug analysis"}</p>
        <button
          onClick={fetchDebugData}
          className="px-4 py-2 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-[#F3F3F4] transition-colors"
        >
          Retry Debugger
        </button>
      </div>
    );
  }

  const root = analysis.root;
  const trace = analysis.trace;

  return (
    <div className="w-full space-y-6">
      {/* Top Banner: Diagnosis & Stack Trace */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Root Cause Card (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-[#2A2A2F] border border-[#6A040F] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D00000]/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6A040F] text-[#F3F3F4] text-xs font-mono font-semibold tracking-wider uppercase border border-[#D00000]/40">
                <AlertOctagon className="w-3.5 h-3.5 text-[#D00000]" />
                <span>ROOT CAUSE IDENTIFIED</span>
              </span>

              {root && (
                <span className="text-xs font-mono text-[#9E9EA7]">
                  CONFIDENCE: {Math.round(root.confidence * 100)}%
                </span>
              )}
            </div>

            {root ? (
              <>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#F3F3F4] mb-3">
                  {root.name}
                </h2>

                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-[#0E0E10] border border-[#35353B]">
                    <div className="text-[10px] font-mono text-[#9E9EA7] uppercase">Concept Debt</div>
                    <div className="text-2xl font-display font-bold text-[#D00000]">
                      {root.debt.toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E0E10] border border-[#35353B]">
                    <div className="text-[10px] font-mono text-[#9E9EA7] uppercase">Direct Mistakes</div>
                    <div className="text-2xl font-display font-bold text-[#F3F3F4]">
                      {root.mistakes}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E0E10] border border-[#35353B]">
                    <div className="text-[10px] font-mono text-[#9E9EA7] uppercase">Affects Topics</div>
                    <div className="text-2xl font-display font-bold text-amber-400">
                      {root.affected_topics.length}
                    </div>
                  </div>
                </div>

                {/* Misconceptions detected */}
                {root.misconceptions.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <div className="text-xs font-mono text-[#9E9EA7] uppercase tracking-wider">
                      Observed Misconception Pattern:
                    </div>
                    {root.misconceptions.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-[#0E0E10] border border-[#6A040F]/50 flex items-center justify-between text-xs text-[#F3F3F4]"
                      >
                        <span className="font-semibold">{m.name}</span>
                        <span className="px-2 py-0.5 rounded bg-[#6A040F] text-[10px] font-mono text-[#F3F3F4]">
                          {m.count}x observed
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Plain-Language Explanation */}
                <div className="p-4 rounded-xl bg-[#0E0E10] border border-[#35353B] mb-6 space-y-3">
                  <p className="text-sm text-[#F3F3F4] leading-relaxed font-sans">
                    {analysis.explanation.summary}
                  </p>
                  
                  {root.ncert && (
                    <div className="p-3 rounded-lg bg-[#6A040F]/30 border border-[#D00000]/40 flex items-center gap-2.5 text-xs text-[#F3F3F4]">
                      <span className="w-2 h-2 rounded-full bg-[#D00000] shrink-0" />
                      <div>
                        <span className="font-mono text-[#D00000] font-semibold uppercase mr-1.5">REVISE NCERT:</span>
                        <span className="font-semibold text-white">{root.ncert}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-[#9E9EA7] font-sans">
                    {analysis.explanation.advice}
                  </p>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-sm text-[#9E9EA7]">
                No critical root cause detected. All prerequisites are currently within normal thresholds.
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-[#35353B] flex items-center justify-between gap-4">
            <button
              onClick={fetchDebugData}
              className="px-4 py-2.5 rounded-xl bg-[#0E0E10] hover:bg-[#35353B] text-xs font-semibold text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Analysis</span>
            </button>

            {root && (
              <button
                onClick={onStartRepair}
                disabled={isRepairing}
                className="px-6 py-2.5 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-[#F3F3F4] tracking-wider uppercase transition-all shadow-lg shadow-[#6A040F]/30 flex items-center gap-2 border border-[#D00000]/40"
              >
                {isRepairing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading Repair Drills...</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 text-[#F3F3F4]" />
                    <span>Repair the Root Cause (3 Questions)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Cascading Stack Trace (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-[#2A2A2F] border border-[#35353B] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#9E9EA7] tracking-wider uppercase flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-[#D00000]" />
                <span>PREREQUISITE STACK TRACE</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E0E10] text-[#9E9EA7]">
                TOP-DOWN FAILURE PROPAGATION
              </span>
            </div>

            <p className="text-xs text-[#9E9EA7] mb-6 leading-relaxed">
              How the mistake in an advanced question propagates backwards to the underlying prerequisite:
            </p>

            {/* Trace Steps Chain */}
            <div className="space-y-3 relative">
              {trace && trace.length > 0 ? (
                trace.map((step, idx) => {
                  const isRoot = idx === trace.length - 1;
                  return (
                    <div key={step.concept_id} className="relative">
                      <div
                        className={`p-4 rounded-xl border transition-all ${
                          isRoot
                            ? "bg-[#6A040F]/30 border-[#D00000] shadow-md"
                            : "bg-[#0E0E10] border-[#35353B]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                                isRoot
                                  ? "bg-[#D00000] text-white"
                                  : "bg-[#2A2A2F] text-[#9E9EA7]"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-display font-semibold text-sm text-[#F3F3F4]">
                              {step.name}
                            </span>
                          </div>

                          <span
                            className={`text-xs font-mono font-bold ${
                              isRoot ? "text-[#D00000]" : "text-amber-400"
                            }`}
                          >
                            {step.debt.toFixed(1)}% debt
                          </span>
                        </div>

                        <div className="text-[11px] text-[#9E9EA7] mt-1 pl-7 font-mono">
                          {isRoot ? "← PRIMARY ROOT BOTTLENECK" : "↑ Cascaded symptom"}
                        </div>
                      </div>

                      {/* Connecting line */}
                      {idx < trace.length - 1 && (
                        <div className="w-0.5 h-3 bg-[#35353B] mx-auto my-0.5" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-[#9E9EA7] py-6 text-center">
                  No active propagation trace.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#35353B] text-[11px] text-[#9E9EA7] flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#D00000]" />
            <span>Fixing step {trace.length} automatically heals steps 1 through {trace.length - 1}.</span>
          </div>
        </div>
      </div>

      {/* Concept Debt Ledger Table */}
      <div className="rounded-3xl bg-[#2A2A2F] border border-[#35353B] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-xl font-display font-bold text-[#F3F3F4]">
              Accumulated Concept Debt
            </h3>
            <p className="text-xs text-[#9E9EA7]">
              Ranked by accumulated weakness signal across all observed test interactions.
            </p>
          </div>

          <span className="text-xs font-mono text-[#9E9EA7]">
            {analysis.concepts.length} CONCEPTS EVALUATED
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[#35353B] text-[#9E9EA7] font-mono text-[11px]">
                <th className="pb-3 font-semibold uppercase">Concept</th>
                <th className="pb-3 font-semibold uppercase w-1/3">Debt Level</th>
                <th className="pb-3 font-semibold uppercase text-center">Mistakes</th>
                <th className="pb-3 font-semibold uppercase">Affected Topics</th>
                <th className="pb-3 font-semibold uppercase text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#35353B]">
              {analysis.concepts.map((c) => {
                const isRoot = c.status === "root";
                const isTrace = c.status === "trace";
                return (
                  <tr
                    key={c.concept_id}
                    onClick={() => {
                      setSelectedConceptId(c.concept_id);
                      if (onSelectConcept) onSelectConcept(c.concept_id);
                    }}
                    className={`hover:bg-[#1A1A1E] transition-colors cursor-pointer ${
                      selectedConceptId === c.concept_id ? "bg-[#1A1A1E]" : ""
                    }`}
                  >
                    {/* Name */}
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-sm text-[#F3F3F4] flex items-center gap-2">
                        <span>{c.name}</span>
                        {isRoot && (
                          <span className="w-2 h-2 rounded-full bg-[#D00000] animate-pulse" />
                        )}
                      </div>
                      <div className="text-[10px] text-[#9E9EA7] font-mono">
                        Level {c.level} · Confidence {Math.round(c.confidence * 100)}%
                      </div>
                    </td>

                    {/* Debt Bar */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-[#0E0E10] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isRoot
                                ? "bg-[#D00000]"
                                : isTrace
                                ? "bg-amber-400"
                                : c.debt >= 10
                                ? "bg-[#6A040F]"
                                : "bg-[#35353B]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, c.debt))}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs w-12 text-right text-[#F3F3F4]">
                          {c.debt.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Mistakes */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-[#F3F3F4]">
                      {c.mistakes}
                    </td>

                    {/* Affected Topics */}
                    <td className="py-3.5 px-4 text-[#9E9EA7] font-mono text-[11px]">
                      {c.affected_topics && c.affected_topics.length > 0 ? (
                        <span>{c.affected_topics.length} topics impacted</span>
                      ) : (
                        <span className="text-[#5B6275]">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 pl-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-[10px] font-mono font-semibold uppercase ${
                          isRoot
                            ? "bg-[#6A040F] text-[#F3F3F4] border border-[#D00000]/60"
                            : isTrace
                            ? "bg-amber-950 text-amber-300 border border-amber-600/40"
                            : c.status === "failed"
                            ? "bg-[#2A2A2F] text-rose-300 border border-rose-500/30"
                            : c.status === "at_risk"
                            ? "bg-[#2A2A2F] text-amber-200 border border-amber-700/30"
                            : "bg-[#0E0E10] text-[#9E9EA7]"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
