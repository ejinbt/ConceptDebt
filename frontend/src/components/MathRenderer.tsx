import { InlineMath } from "react-katex";

interface MathRendererProps {
  text: string;
  className?: string;
}

export function MathRenderer({ text, className = "" }: MathRendererProps) {
  if (!text) return null;

  // Detect prompts that contain english sentences combined with math, e.g. "Work out 1/2 + 1/3" or "Expand 3(2x + 1)"
  // or pure math expressions
  const hasFractions = /\b\d+\/\d+\b/.test(text);
  const hasPowers = /\b[a-zA-Z0-9]+\^[a-zA-Z0-9]+\b/.test(text);
  const hasAlgebra = /[a-zA-Z0-9]+\([a-zA-Z0-9\s\+\-]+\)/.test(text);

  if (hasFractions || hasPowers || hasAlgebra) {
    try {
      // If it starts with common words like "Work out", "Expand", "Solve", "Factor", extract and render math part
      const match = text.match(/^(Work out|Expand|Solve|Factor|Simplify|Evaluate)\s+(.*)$/i);
      if (match) {
        const prefix = match[1];
        const mathPart = match[2];
        const formatted = formatToLatex(mathPart);
        return (
          <span className={`inline-flex items-center flex-wrap gap-2 ${className}`}>
            <span>{prefix}</span>
            <span className="font-mono text-[#F3F3F4]">
              <InlineMath math={formatted} />
            </span>
          </span>
        );
      }

      const formatted = formatToLatex(text);
      return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
          <InlineMath math={formatted} />
        </span>
      );
    } catch {
      return <span className={className}>{text}</span>;
    }
  }

  return <span className={className}>{text}</span>;
}

function formatToLatex(expr: string): string {
  return expr
    .replace(/(\d+)\/(\d+)/g, "\\frac{$1}{$2}")
    .replace(/\*/g, " \\cdot ")
    .replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
}
