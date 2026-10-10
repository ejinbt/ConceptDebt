import { InlineMath } from "react-katex";

interface MathRendererProps {
  text: string;
  className?: string;
}

export function MathRenderer({ text, className = "" }: MathRendererProps) {
  // If text doesn't contain math operators or symbols, render directly
  if (!text) return null;

  // Split on potential math phrases or render formulas
  // Converts simple expressions like 1/2 + 1/3, 3(2x + 3), x^2 into LaTeX notation if helpful,
  // or renders parts with InlineMath when standard math syntax is detected.
  const containsMath = /[0-9]+[\+\-\*\/][0-9]+|\^|\/|x\^|sqrt/.test(text);

  if (containsMath) {
    try {
      // Basic formatting to clean latex if needed
      let formatted = text
        .replace(/(\d+)\/(\d+)/g, "\\frac{$1}{$2}")
        .replace(/\*/g, " \\cdot ")
        .replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");

      return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
          <InlineMath math={formatted} />
        </span>
      );
    } catch {
      return <span className={className}>{text}</span>;
    }
  }

  return <span className={className}>{text}</span>;
}
