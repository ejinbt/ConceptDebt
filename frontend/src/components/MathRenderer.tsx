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
  // A single math term:
  // - parenthesized block with optional sign, coeff, and/or power: [-−]?\d*\([^)]+\)(?:\^[0-9]+)?
  // - fraction: \b\d+\/\d+\b
  // - variable with power/coeff: \b\d*[a-zA-Z](?:\^[0-9]+)?
  // - number with power: \b\d+(?:\^[0-9]+)?
  const term = "(?:[-−]?\\d*\\([^)]+\\)(?:\\^[0-9]+)?|[-−]?\\([^)]+\\)(?:\\^[0-9]+)?|\\b\\d+\\/\\d+\\b|[-−]?\\b\\d*[a-zA-Z](?:\\^[0-9]+)?|[-−]?\\b\\d+(?:\\^[0-9]+)?)";
  const op = "(?:\\s*[\\+\\−\\-\\*\\/·×÷=><]\\s*)";

  // Expression is:
  // 1. One or more terms connected by operators: term (op term)+
  // 2. Or juxtaposition of brackets: (term)+ (e.g. (x+2)(x+5))
  // 3. Or a single compound term like 3(x + 2), -(x - 7), (x + 3)^2, x^2
  const mathRegex = new RegExp(`(?:${term}(?:${op}${term})+|(?:\\([^)]+\\)){2,}|[-−]?\\d*\\([^)]+\\)(?:\\^[0-9]+)?|[-−]?\\([^)]+\\)(?:\\^[0-9]+)?|\\b[a-zA-Z]\\^[0-9]+|\\b\\d+\\/\\d+\\b)`, "g");

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
