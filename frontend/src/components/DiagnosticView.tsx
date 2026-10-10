import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  FileText,
  Sparkles,
  ArrowRight,
  BookOpen,
  HelpCircle as QuestionIcon
} from "lucide-react";
import { api } from "../services/api";
import { MathRenderer } from "./MathRenderer";
import type { QuestionOut, AttemptOut, SessionOut } from "../types/api";

interface DiagnosticViewProps {
  session: SessionOut;
  onComplete: () => void;
  onSessionUpdate: (session: SessionOut) => void;
  onExitTest?: () => void;
}

export function DiagnosticView({ session, onComplete, onExitTest }: DiagnosticViewProps) {
  const [questions, setQuestions] = useState<QuestionOut[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; working: string; notLearned?: boolean }>>({});
  const [attemptResults, setAttemptResults] = useState<Record<string, AttemptOut>>({});
  
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentWorking, setCurrentWorking] = useState("");
  const [showWorking, setShowWorking] = useState(false);
  
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [markingNotLearned, setMarkingNotLearned] = useState(false);
  const [invalidNotice, setInvalidNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch class-specific diagnostic questions and past attempts for this session
  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getDiagnostic(session.session_id),
      api.getAttempts(session.session_id).catch(() => []),
    ])
      .then(([questionList, existingAttempts]) => {
        if (!mounted) return;
        setQuestions(questionList);

        // Pre-populate answers from server if the user refreshed or resumed
        if (existingAttempts && existingAttempts.length > 0) {
          const loadedAnswers: Record<string, { answer: string; working: string; notLearned?: boolean }> = {};
          const loadedResults: Record<string, AttemptOut> = {};

          existingAttempts.forEach((att) => {
            loadedAnswers[att.question_id] = {
              answer: att.answer || "",
              working: att.working || "",
              notLearned: att.source === "not_learned",
            };
            loadedResults[att.question_id] = att;
          });

          setAnswers(loadedAnswers);
          setAttemptResults(loadedResults);

          // Find first unanswered question index
          const firstUnanswered = questionList.findIndex((q) => !loadedAnswers[q.id]);
          if (firstUnanswered !== -1) {
            setCurrentIndex(firstUnanswered);
          }
        }

        setLoadingQuestions(false);
      })
      .catch((err) => {
        if (mounted) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to load diagnostic questions");
          setLoadingQuestions(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [session.session_id]);

  // Update input fields whenever current index changes
  const activeQuestion = questions[currentIndex];

  useEffect(() => {
    if (activeQuestion) {
      const existing = answers[activeQuestion.id];
      setCurrentAnswer(existing?.answer || "");
      setCurrentWorking(existing?.working || "");
      setInvalidNotice(null);
    }
  }, [currentIndex, activeQuestion]);

  if (loadingQuestions) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="w-8 h-8 text-[#D00000] animate-spin mb-4" />
        <p className="text-sm font-mono text-[#9E9EA7]">
          RETRIEVING {session.grade ? `CLASS ${session.grade}` : "CLASS 10"} DIAGNOSTIC BENCHMARKS...
        </p>
      </div>
    );
  }

  if (errorMessage || !activeQuestion) {
    return (
      <div className="max-w-xl mx-auto p-6 rounded-2xl bg-[#2A2A2F] border border-[#6A040F] text-center my-12">
        <AlertCircle className="w-8 h-8 text-[#D00000] mx-auto mb-3" />
        <h3 className="font-display font-semibold text-lg text-[#F3F3F4] mb-2">Could Not Load Diagnostic</h3>
        <p className="text-xs text-[#9E9EA7] mb-4">{errorMessage || "Unknown error occurred"}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-[#6A040F] text-[#F3F3F4] text-xs font-semibold hover:bg-[#D00000] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const handleSubmitAttempt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentAnswer.trim() || submitting || markingNotLearned) return;

    setSubmitting(true);
    setInvalidNotice(null);

    try {
      const res = await api.submitAttempt({
        session_id: session.session_id,
        question_id: activeQuestion.id,
        answer: currentAnswer.trim(),
        working: currentWorking.trim() || null,
      });

      // Handle gibberish response: "source": "invalid" means unparseable math
      if (res.source === "invalid") {
        setInvalidNotice("The math engine could not parse this format. Please re-enter your answer (e.g. 3x + 6, x^2, or 5/6). It will not count against you.");
        setSubmitting(false);
        return;
      }

      setAnswers((prev) => ({
        ...prev,
        [activeQuestion.id]: { answer: currentAnswer.trim(), working: currentWorking.trim(), notLearned: false },
      }));

      setAttemptResults((prev) => ({
        ...prev,
        [activeQuestion.id]: res,
      }));

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setInvalidNotice(err instanceof Error ? err.message : "Error submitting answer");
    } finally {
      setSubmitting(false);
    }
  };

  // "Haven't learned this yet" handler
  const handleNotLearnedYet = async () => {
    if (submitting || markingNotLearned) return;
    setMarkingNotLearned(true);
    setInvalidNotice(null);

    try {
      const res = await api.submitAttempt({
        session_id: session.session_id,
        question_id: activeQuestion.id,
        not_learned: true,
      });

      setAnswers((prev) => ({
        ...prev,
        [activeQuestion.id]: { answer: "", working: "", notLearned: true },
      }));

      setAttemptResults((prev) => ({
        ...prev,
        [activeQuestion.id]: res,
      }));

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setInvalidNotice(err instanceof Error ? err.message : "Error recording response");
    } finally {
      setMarkingNotLearned(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentRecord = answers[activeQuestion.id];
  const hasAnsweredCurrent = !!currentRecord;
  const isCurrentNotLearned = !!currentRecord?.notLearned;

  return (
    <div className="max-w-4xl mx-auto w-full py-4">
      {/* Question Tracker Pill Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-mono text-[#9E9EA7] mb-3">
          <div className="flex items-center gap-3">
            {onExitTest && (
              <button
                type="button"
                onClick={onExitTest}
                className="text-xs text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors flex items-center gap-1 font-mono hover:underline"
              >
                <span>← Exit Test</span>
              </button>
            )}
            <span>{session.grade ? `CLASS ${session.grade} DIAGNOSTIC` : "DIAGNOSTIC PROGRESS"}</span>
          </div>
          <span>{answeredCount} / {questions.length} ANSWERED</span>
        </div>
        
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#2A2A2F] border border-[#35353B]">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isAnswered = !!ans;
            const isNotLearned = !!ans?.notLearned;
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-1 min-w-[34px] h-9 rounded-lg font-mono text-xs flex items-center justify-center transition-all ${
                  isCurrent
                    ? "bg-[#D00000] text-[#F3F3F4] font-bold ring-2 ring-[#D00000]/40 shadow-sm"
                    : isNotLearned
                    ? "bg-[#35353B] text-[#9E9EA7] border border-dashed border-[#5B6275]"
                    : isAnswered
                    ? "bg-[#6A040F]/60 text-[#F3F3F4] border border-[#D00000]/30 hover:bg-[#6A040F]"
                    : "bg-[#0E0E10] text-[#9E9EA7] hover:bg-[#35353B]"
                }`}
              >
                {String(idx + 1).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="rounded-2xl bg-[#2A2A2F] border border-[#35353B] overflow-hidden shadow-2xl">
        {/* Card Header with NCERT badge */}
        <div className="px-6 py-4 border-b border-[#35353B] flex flex-wrap items-center justify-between gap-3 bg-[#1A1A1E]">
          <div className="flex items-center flex-wrap gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#6A040F] text-[11px] font-mono tracking-wider text-[#F3F3F4] uppercase">
              {activeQuestion.concept_name}
            </span>

            {activeQuestion.ncert && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0E0E10] border border-[#35353B] text-[11px] font-mono text-[#F3F3F4]">
                <BookOpen className="w-3 h-3 text-[#D00000]" />
                <span>{activeQuestion.ncert}</span>
              </span>
            )}

            <span className="text-xs text-[#9E9EA7] font-mono hidden sm:inline">
              [Kind: {activeQuestion.kind}]
            </span>
          </div>

          <span className="text-xs font-mono text-[#9E9EA7]">
            QUESTION {currentIndex + 1} OF {questions.length}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-8">
          {/* Question Prompt */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-medium text-[#F3F3F4] leading-relaxed">
              <MathRenderer text={activeQuestion.prompt} />
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitAttempt} className="space-y-4">
            {/* Answer Input */}
            <div>
              <label className="block text-xs font-mono text-[#9E9EA7] mb-2 uppercase tracking-wider">
                Your Answer
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="e.g. 3x + 6, x^2, 5/6, or 3(2x + 3)"
                  autoFocus
                  required
                  className="w-full bg-[#0E0E10] border border-[#35353B] focus:border-[#D00000] rounded-xl px-4 py-3.5 text-lg font-mono text-[#F3F3F4] placeholder:text-[#5B6275] focus:outline-none transition-all"
                />
                {hasAnsweredCurrent && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-mono">
                    {isCurrentNotLearned ? (
                      <span className="text-amber-400">Marked as unlearned</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Saved</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-[#9E9EA7] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#D00000]" />
                <span>Format hint: Use <code className="text-[#F3F3F4]">^</code> for powers, <code className="text-[#F3F3F4]">/</code> for fractions. Expressions are checked for mathematical equivalence.</span>
              </p>
            </div>

            {/* Optional Scratchpad / Working Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowWorking(!showWorking)}
                className="text-xs font-mono text-[#9E9EA7] hover:text-[#F3F3F4] flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#D00000]" />
                <span>{showWorking ? "Hide Working / Scratchpad" : "+ Add Step-by-Step Working (Helps AI Diagnosis)"}</span>
              </button>

              {showWorking && (
                <div className="mt-3">
                  <textarea
                    rows={2}
                    value={currentWorking}
                    onChange={(e) => setCurrentWorking(e.target.value)}
                    placeholder="Describe how you worked this out (e.g. 'multiplied 3 by x then added 2')..."
                    className="w-full bg-[#0E0E10] border border-[#35353B] focus:border-[#6A040F] rounded-xl p-3 text-xs text-[#F3F3F4] placeholder:text-[#5B6275] focus:outline-none resize-none font-sans"
                  />
                </div>
              )}
            </div>

            {/* Invalid Expression Notice */}
            {invalidNotice && (
              <div className="p-3.5 rounded-xl bg-[#6A040F]/30 border border-[#D00000] flex items-start gap-2.5 text-xs text-[#F3F3F4]">
                <AlertCircle className="w-4 h-4 text-[#D00000] shrink-0 mt-0.5" />
                <span>{invalidNotice}</span>
              </div>
            )}

            {/* Navigation & Submission Controls */}
            <div className="pt-6 border-t border-[#35353B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-[#0E0E10] hover:bg-[#35353B] text-xs font-semibold text-[#F3F3F4] transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {/* "Haven't learned this yet" button */}
                <button
                  type="button"
                  onClick={handleNotLearnedYet}
                  disabled={markingNotLearned || submitting}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0E0E10] hover:bg-[#2A2A2F] border border-[#35353B] text-xs font-mono text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors flex items-center gap-1.5"
                  title="Marks topic as not covered yet without counting as a mistake"
                >
                  {markingNotLearned ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Haven't learned this yet</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {currentIndex < questions.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-4 py-2.5 rounded-xl bg-[#0E0E10] hover:bg-[#35353B] text-xs font-semibold text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors flex items-center gap-1.5"
                  >
                    <span>Skip</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting || markingNotLearned || !currentAnswer.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#6A040F] hover:bg-[#D00000] text-xs font-semibold text-[#F3F3F4] tracking-wider uppercase transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#6A040F]/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{hasAnsweredCurrent && !isCurrentNotLearned ? "Update Answer" : "Submit Answer"}</span>
                    </>
                  )}
                </button>

                {answeredCount >= 5 && (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="px-5 py-2.5 rounded-xl bg-[#F3F3F4] hover:bg-white text-[#0E0E10] text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 ml-2"
                  >
                    <span>Finish Diagnostic</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
