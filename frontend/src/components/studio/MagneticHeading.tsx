import { useRef, useEffect } from "react";
import gsap from "gsap";

interface MagneticHeadingProps {
  line1?: string;
  line2?: string;
  className?: string;
}

export function MagneticHeading({
  line1 = "DEBUG YOUR",
  line2 = "CONCEPT DEBT",
  className = "",
}: MagneticHeadingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const front = frontRef.current;
    const back = backRef.current;
    if (!container || !front || !back) return;

    // Check prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const maxOffsetFront = 32; // pixels
    const maxOffsetBack = 16;  // inverted depth offset

    const xFront = gsap.quickTo(front, "x", { duration: 0.6, ease: "power3.out" });
    const yFront = gsap.quickTo(front, "y", { duration: 0.6, ease: "power3.out" });
    const xBack = gsap.quickTo(back, "x", { duration: 0.9, ease: "power3.out" });
    const yBack = gsap.quickTo(back, "y", { duration: 0.9, ease: "power3.out" });

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      xFront(dx * maxOffsetFront);
      yFront(dy * maxOffsetFront);
      xBack(-dx * maxOffsetBack);
      yBack(-dy * maxOffsetBack);
    };

    const handlePointerLeave = () => {
      gsap.to([front, back], {
        x: 0,
        y: 0,
        duration: 1.2,
        ease: "elastic.out(1, 0.3)",
      });
    };

    container.addEventListener("mousemove", handlePointerMove);
    container.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      container.removeEventListener("mousemove", handlePointerMove);
      container.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative py-6 sm:py-10 select-none cursor-default ${className}`}
    >
      {/* Background layer with parallax offset & velvet maroon glow */}
      <div
        ref={backRef}
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center opacity-30 blur-[1px] pointer-events-none select-none"
        style={{ willChange: "transform" }}
      >
        <div className="text-5xl sm:text-7xl lg:text-[7rem] font-display font-black tracking-tight uppercase leading-[0.9] text-[#6A040F]">
          {line1}
        </div>
        <div className="text-5xl sm:text-7xl lg:text-[7rem] font-display font-black tracking-tight uppercase leading-[0.9] text-[#D00000]">
          {line2}
        </div>
      </div>

      {/* Front active layer tracking cursor */}
      <div
        ref={frontRef}
        className="relative z-10 flex flex-col items-center justify-center"
        style={{ willChange: "transform" }}
      >
        <h1 className="text-5xl sm:text-7xl lg:text-[7rem] font-display font-black tracking-tight uppercase leading-[0.9] text-[#F3F3F4]">
          {line1}
        </h1>
        <h1 className="text-5xl sm:text-7xl lg:text-[7rem] font-display font-black tracking-tight uppercase leading-[0.9] text-transparent bg-clip-text bg-gradient-to-r from-[#D00000] via-[#ff2a55] to-[#F3F3F4]">
          {line2}
        </h1>
      </div>
    </div>
  );
}
