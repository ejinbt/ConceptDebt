import React from "react";
import { InlineMath } from "react-katex";

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Parses a prompt containing mixed natural language and math expressions.
 * Keeps normal English words as standard text with native spacing,
 * and renders algebraic/math formulas with KaTeX.
 */
export function MathRenderer({ text, className = "" }: MathRendererProps) {
  if (!text) return null;

  // Split sentence into words and mathematical segments
  // Words with letters only or common punctuation are text.
  // Expressions with ^, /, =, <, >, +, *, ×, ÷, ·, √, (x, etc. are math.
  const tokens = tokenizePrompt(text);

  return (
    <span className={`inline ${className}`}>
      {tokens.map((token, idx) => {
        if (token.isMath) {
          try {
            const latex = formatToLatex(token.value);
            return (
              <span key={idx} className="inline-block mx-1 font-mono text-[#F3F3F4]">
                <InlineMath math={latex} />
              </span>
            );
          } catch {
            return <span key={idx} className="font-mono">{token.value}</span>;
          }
        }
        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
      })}
    </span>
  );
}

interface Token {
  value: string;
  isMath: boolean;
}

function tokenizePrompt(prompt: string): Token[] {
  // Regex to recognize math segments:
  // - Fractions: 1/2, 3/4
  // - Polynomials / algebraic expressions: x^2 + 5x, 2(x + 3), p(x) = x^2 - 3x + 5, p(2)
  // - Arithmetic equations / inequalities: x > 0, 2 + 3 × 4, √(9 + 16), x + y = 10
  // Non-math segments: "Work out", "Factorise", "completely", "If", "find", "What is x?", etc.

  // We match math patterns specifically:
  const mathRegex = /(\b[a-zA-Z]\([a-zA-Z0-9\s\+\-\*\/]+\)\s*=\s*[a-zA-Z0-9\^_\+\-\*\/·×÷\s]+|\b[a-zA-Z]\([a-zA-Z0-9\+\-]+\)|(?:[a-zA-Z0-9]+|\([a-zA-Z0-9\s\+\-]+\))\^[a-zA-Z0-9]+|[a-zA-Z0-9\s\+\-]*=[a-zA-Z0-9\s\+\-\*\/]+|\b\d+\s*[\+\−\-\*\/·×÷]\s*\d+(?:\s*[\+\−\-\*\/·×÷]\s*\d+)*|\b\d+\/\d+\b|\b\d+[a-zA-Z]\b|[a-zA-Z]\s*[><=]\s*\d+|√\([^)]+\)|√\d+)/g;

  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(prompt)) !== null) {
    const mathStart = match.index;
    const mathEnd = mathRegex.lastIndex;

    // Push the text before the math
    if (mathStart > lastIndex) {
      tokens.push({
        value: prompt.substring(lastIndex, mathStart),
        isMath: false,
      });
    }

    // Push the math segment
    tokens.push({
      value: match[0],
      isMath: true,
    });

    lastIndex = mathEnd;
  }

  // Push remaining text
  if (lastIndex < prompt.length) {
    tokens.push({
      value: prompt.substring(lastIndex),
      isMath: false,
    });
  }

  // Fallback: If no math segment was caught but the whole string contains arithmetic symbols
  if (tokens.length === 1 && !tokens[0].isMath && /[0-9]+[\+\-\*\/][0-9]+|\^/.test(prompt)) {
    // If it's a simple command like "Expand 3(x + 2)" or "Factorise 6x + 9 completely"
    const m = prompt.match(/^([a-zA-Z\s]+?)\s+([a-zA-Z0-9\^_\+\-\*\/·×÷()=\s]+?)(?:\s+([a-zA-Z\s.,?!]+))?$/);
    if (m) {
      const res: Token[] = [];
      if (m[1]) res.push({ value: m[1] + " ", isMath: false });
      if (m[2]) res.push({ value: m[2], isMath: true });
      if (m[3]) res.push({ value: " " + m[3], isMath: false });
      return res;
    }
  }

  return tokens.length > 0 ? tokens : [{ value: prompt, isMath: false }];
}

function formatToLatex(expr: string): string {
  return expr
    .trim()
    .replace(/(\d+)\/(\d+)/g, "\\frac{$1}{$2}")
    .replace(/\*/g, " \\cdot ")
    .replace(/·/g, " \\cdot ")
    .replace(/×/g, " \\times ")
    .replace(/÷/g, " \\div ")
    .replace(/−/g, " - ")
    .replace(/√\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/√(\d+)/g, "\\sqrt{$1}");
}
