import { ReactNode } from "react";

interface PillBadgeProps {
  children: ReactNode;
  angle?: 1 | 2 | 3 | 4 | "none";
  variant?: "maroon" | "crimson" | "surface" | "emerald" | "amber";
  className?: string;
  onClick?: () => void;
}

export function PillBadge({
  children,
  angle = 1,
  variant = "surface",
  className = "",
  onClick,
}: PillBadgeProps) {
  const angleClasses = {
    1: "-rotate-[6deg]",
    2: "rotate-[3deg]",
    3: "-rotate-[4deg]",
    4: "rotate-[5deg]",
    none: "rotate-0",
  }[angle];

  const variantClasses = {
    surface: "bg-[#2A2A2F] text-[#F3F3F4] border-[#35353B] hover:border-[#D00000] hover:bg-[#35353B]",
    maroon: "bg-[#6A040F] text-[#F3F3F4] border-[#D00000]/40 hover:bg-[#D00000]",
    crimson: "bg-[#D00000] text-white border-transparent hover:bg-[#ff2a55]",
    emerald: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900",
    amber: "bg-amber-950/80 text-amber-300 border-amber-800/60 hover:bg-amber-900",
  }[variant];

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:rotate-0 hover:scale-105 select-none ${angleClasses} ${variantClasses} ${onClick ? "cursor-pointer" : "cursor-default"} ${className}`}
    >
      {children}
    </span>
  );
}
