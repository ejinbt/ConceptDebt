import { useEffect, useRef } from "react";
import gsap from "gsap";
import { getLenis } from "./SmoothScroll";

interface VelocityMarqueeProps {
  className?: string;
}

export function VelocityMarquee({ className = "" }: VelocityMarqueeProps) {
  const trackARef = useRef<HTMLDivElement>(null);
  const trackBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trackA = trackARef.current;
    const trackB = trackBRef.current;
    if (!trackA || !trackB) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Infinite horizontal loops
    const loopA = gsap.to(trackA, {
      xPercent: -50,
      repeat: -1,
      duration: 32,
      ease: "none",
    });

    const loopB = gsap.fromTo(
      trackB,
      { xPercent: -50 },
      { xPercent: 0, repeat: -1, duration: 32, ease: "none" }
    );

    // Bind Lenis velocity skew
    const lenis = getLenis();
    let scrollHandler: ((e: { velocity: number }) => void) | null = null;

    if (lenis) {
      scrollHandler = (e: { velocity: number }) => {
        const v = Math.max(-25, Math.min(25, e.velocity));
        gsap.to([trackA, trackB], {
          skewX: v * 0.2,
          duration: 0.35,
          ease: "power2.out",
        });
      };
      lenis.on("scroll", scrollHandler);
    }

    return () => {
      loopA.kill();
      loopB.kill();
      if (lenis && scrollHandler) {
        lenis.off("scroll", scrollHandler);
      }
    };
  }, []);

  const itemsA = [
    "PREREQUISITE CASCADE DEBUGGER",
    "ROOT CAUSE ISOLATION",
    "NCERT KNOWLEDGE GRAPH",
    "ZERO GUESSWORK DIAGNOSTICS",
    "QWEN 2.5 MISCONCEPTION ENGINE",
  ];

  const itemsB = [
    "REDUCE UNLEARNED DEBT",
    "LEVEL 0 TO 5 TAXONOMY",
    "MATHEMATICAL EQUIVALENCE CHECK",
    "REAL-TIME DOWNSTREAM HEALING",
    "MICRO-HOTFIX DRILLS",
  ];

  return (
    <section className={`relative w-full overflow-hidden py-6 sm:py-8 bg-[#0E0E10] border-y border-[#35353B] select-none ${className}`}>
      {/* Top track moving left */}
      <div className="flex overflow-hidden">
        <div
          ref={trackARef}
          className="flex whitespace-nowrap gap-8 text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-[#F3F3F4] will-change-transform"
        >
          {[...itemsA, ...itemsA].map((text, idx) => (
            <span key={idx} className="flex items-center gap-6">
              <span>{text}</span>
              <span className="text-[#D00000] text-sm">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bottom track moving right */}
      <div className="flex overflow-hidden mt-3">
        <div
          ref={trackBRef}
          className="flex whitespace-nowrap gap-8 text-xs sm:text-sm font-mono uppercase tracking-widest text-[#9E9EA7] will-change-transform"
        >
          {[...itemsB, ...itemsB].map((text, idx) => (
            <span key={idx} className="flex items-center gap-6">
              <span className="text-[#6A040F] font-bold">/</span>
              <span>{text}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
