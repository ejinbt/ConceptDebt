import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Send, 
  Loader2, 
  HelpCircle, 
  Wrench, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { api } from "../services/api";
import { MathRenderer } from "./MathRenderer";
import type { QuestionOut, AttemptOut, SessionOut, RepairOut } from "../types/api";

interface RepairViewProps {
  session: SessionOut;
  onFinishRepair: () => void;
  onBackToDebugger: () => void;
}

export function RepairView({ session, onFinishRepair, onBackToDebugger }: RepairViewProps) {
  const [repairData, setRepairData] = useState<RepairOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Record<string, AttemptOut>>({});
  const [feedback, setFeedback] = useState<AttemptOut | null>(null);

  useEffect(() => {
    let mounted = true;
    api.startRepair(session.session_id, 3)
      .then((data) => {
        if (mounted) {
          setRepairData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to generate repair drills");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [session.session_id]);

  const activeQuestion = repairData?.questions[currentIndex];

  useEffect(() => {
    setCurrentAnswer("");
    setFeedback(null);
  }, [currentIndex]);

  const [invalidNotice, setInvalidNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnswer.trim() || !activeQuestion || submitting) return;

    setSubmitting(true);
    setInvalidNotice(null);
    try {
      const res = await api.submitAttempt({
        session_id: session.session_id,
        question_id: activeQuestion.id,
        answer: currentAnswer.trim(),
      });

      // Handle unparseable typo (source: "invalid") without locking or penalizing
      if (res.source === "invalid") {
        setInvalidNotice("The math engine could not parse this format. Please re-enter your answer (e.g. 4x + 20, -3x - 6). It will not count against you.");
        setSubmitting(false);
        return;
      }

      setResults((prev) => ({ ...prev, [activeQuestion.id]: res }));
      setFeedback(res);
    } catch (err: unknown) {
      setInvalidNotice(err instanceof Error ? err.message : "Error submitting repair attempt");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-8 h-8 text-[#D00000] animate-spin mb-4" />
        <p className="text-sm font-mono text-[#F3F3F4]">GENERATING TARGETED ROOT-CAUSE REPAIR DRILLS...</p>
      </div>
    );
  }

  if (error || !repairData || !activeQuestion) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#2A2A2F] border border-[#6A040F] text-center my-8">
        <p className="text-xs text-[#9E9EA7] mb-4">{error || "Could not load repair mode"}</p>
        <button
          onClick={onBackToDebugger}
          className="px-4 py-2 rounded-xl bg-[#35353B] text-xs font-semibold text-[#F3F3F4]"
        >
          Return to Debugger
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(results).length;
  const isFinished = answeredCount >= repairData.questions.length;

  return (
    <div className="max-w-3xl mx-auto w-full py-4 space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-[#2A2A2F] border border-[#6A040F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#D00000] animate-pulse" />
            <span className="text-xs font-mono text-[#D00000] font-semibold tracking-wider uppercase">
              HOTFIXING ROOT CAUSE
            </span>
          </div>
          <h2 className="text-2xl font-display font-bold text-[#F3F3F4]">
            {repairData.root.name}
          </h2>
          <p className="text-xs text-[#9E9EA7] mt-1 font-mono">
            Starting Debt: {repairData.root.debt.toFixed(1)}% · 3 targeted micro-questions
          </p>
        </div>

        {/* Question Counter Pill */}
        <div className="flex items-center gap-2 bg-[#0E0E10] px-4 py-2 rounded-xl border border-[#35353B]">
          <span className="text-xs font-mono text-[#9E9EA7]">PROGRESS:</span>
          <span className="text-xs font-mono font-bold text-[#F3F3F4]">
            {answeredCount} / {repairData.questions.length}
          </span>
        </div>
      </div>

      {/* Active Repair Question Card */}
      <div className="rounded-3xl bg-[#2A2A2F] border border-[#35353B] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6 border-b border-[#35353B] pb-4">
          <span className="text-xs font-mono text-[#9E9EA7]">
            REPAIR DRILL {currentIndex + 1} OF {repairData.questions.length}
          </span>
          <span className="text-xs font-mono text-[#D00000]">
            [KIND: {activeQuestion.kind}]
          </span>
        </div>

        {/* Prompt */}
        <div className="mb-8">
          <h3 className="text-2xl sm:text-3xl font-display font-medium text-[#F3F3F4] leading-relaxed">
            <MathRenderer text={activeQuestion.prompt} />
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#9E9EA7] mb-2 uppercase tracking-wider">
              Your Answer
            </label>
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              disabled={!!feedback}
              placeholder="e.g. 4x + 20, -3x - 6, 10x - 5"
              autoFocus
              required
              className="w-full bg-[#0E0E10] border border-[#35353B] focus:border-[#D00000] rounded-xl px-4 py-3.5 text-lg font-mono text-[#F3F3F4] focus:outline-none transition-all disabled:opacity-60"
            />
          </div>

          {/* Invalid Expression Notice */}
          {invalidNotice && (
            <div className="p-3.5 rounded-xl bg-[#6A040F]/30 border border-[#D00000] flex items-start gap-2.5 text-xs text-[#F3F3F4]">
              <HelpCircle className="w-4 h-4 text-[#D00000] shrink-0 mt-0.5" />
              <span>{invalidNotice}</span>
            </div>
          )}

          {/* Feedback Display */}
          {feedback && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                feedback.correct
                  ? "bg-emerald-950/40 border-emerald-600 text-emerald-200"
                  : "bg-[#6A040F]/30 border-[#D00000] text-[#F3F3F4]"
              }`}
            >
              {feedback.correct ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-[#D00000] shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-sm mb-1">
                  {feedback.correct ? "Correct! Concept applied accurately." : "Incorrect."}
                </div>
                {!feedback.correct && feedback.correct_answer && (
                  <div className="font-mono text-xs text-[#9E9EA7] mb-1">
                    Expected answer: <span className="text-[#F3F3F4] font-bold">{feedback.correct_answer}</span>
                  </div>
                )}
                {feedback.rationale && <p className="mt-1">{feedback.rationale}</p>}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="pt-6 border-t border-[#35353B] flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToDebugger}
              className="px-4 py-2.5 rounded-xl bg-[#0E0E10] hover:bg-[#35353B] text-xs font-semibold text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors"
            >
              Back to Debugger
            </button>

            {!feedback ? (
              <button
                type="submit"
                disabled={submitting || !currentAnswer.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-[#F3F3F4] tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg shadow-[#6A040F]/30 border border-[#D00000]/40"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Repair</span>
                  </>
                )}
              </button>
            ) : currentIndex < repairData.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-6 py-2.5 rounded-xl bg-[#F3F3F4] hover:bg-white text-[#0E0E10] text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-2"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinishRepair}
                className="px-8 py-2.5 rounded-xl bg-[#D00000] hover:bg-[#b00000] text-white text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-2 shadow-xl shadow-[#D00000]/30"
              >
                <span>Re-Verify & Run Regression Test</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
