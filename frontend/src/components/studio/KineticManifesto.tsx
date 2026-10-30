import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PillBadge } from "./PillBadge";
import { Layers, Activity, GitBranch } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export function KineticManifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const pill1Ref = useRef<HTMLDivElement>(null);
  const pill2Ref = useRef<HTMLDivElement>(null);
  const pill3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const textEl = textRef.current;
    if (!section || !textEl) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Split text into characters with word grouping
    const originalText = textEl.innerText;
    const words = originalText.split(" ");
    textEl.innerHTML = words
      .map((w) => {
        const chars = w
          .split("")
          .map((c) => `<span class="scrub-char inline-block">${c}</span>`)
          .join("");
        return `<span class="scrub-word inline-block mr-2">${chars}</span>`;
      })
      .join("");

    const chars = textEl.querySelectorAll<HTMLSpanElement>(".scrub-char");

    gsap.set(chars, {
      color: "rgba(110, 110, 120, 0.35)",
      textShadow: "0 0 0px rgba(208, 0, 0, 0)",
    });

    const pills = [pill1Ref.current, pill2Ref.current, pill3Ref.current].filter(Boolean);
    pills.forEach((p) => {
      gsap.set(p, { scale: 0, opacity: 0 });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 75%",
        end: "bottom 30%",
        scrub: 0.8,
      },
    });

    // Character illumination sequence
    tl.to(chars, {
      color: "#F3F3F4",
      textShadow: "0 0 16px rgba(208, 0, 0, 0.7), 0 0 32px rgba(106, 4, 15, 0.4)",
      stagger: 0.04,
      ease: "power1.inOut",
    }).to(
      chars,
      {
        textShadow: "0 0 0px rgba(208, 0, 0, 0)",
        stagger: 0.04,
        ease: "power1.out",
      },
      "<0.1"
    );

    // Staggered milestone pill badges pop in
    pills.forEach((pill, idx) => {
      tl.to(
        pill,
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "back.out(2)",
        },
        0.2 + idx * 0.25
      );
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === section) t.kill();
      });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-20 sm:py-32 px-6 sm:px-12 max-w-6xl mx-auto flex flex-col items-center justify-center text-center select-none"
    >
      <div className="flex items-center gap-2 mb-8">
        <span className="w-2 h-2 rounded-full bg-[#D00000] animate-pulse" />
        <span className="text-xs font-mono uppercase tracking-widest text-[#9E9EA7]">
          THE CONCEPT DEBT THESIS
        </span>
      </div>

      <div className="relative max-w-4xl">
        <p
          ref={textRef}
          className="text-2xl sm:text-4xl lg:text-5xl font-display font-black uppercase tracking-tight leading-[1.25] text-[#9E9EA7]"
        >
          TRADITIONAL SCORES ONLY REPORT SYMPTOMS. WE TRACE CASCADING ERRORS BACKWARDS THROUGH THE MATHEMATICAL PREREQUISITE GRAPH TO EXPOSE THE FOUNDATIONAL BUG.
        </p>

        {/* Milestone floating pill badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <div ref={pill1Ref}>
            <PillBadge angle={1} variant="maroon">
              <Layers className="w-3.5 h-3.5 text-[#D00000]" />
              <span>LEVEL 0-5 KNOWLEDGE GRAPH</span>
            </PillBadge>
          </div>
          <div ref={pill2Ref}>
            <PillBadge angle={2} variant="surface">
              <GitBranch className="w-3.5 h-3.5 text-[#F3F3F4]" />
              <span>TOP-DOWN STACK TRACE</span>
            </PillBadge>
          </div>
          <div ref={pill3Ref}>
            <PillBadge angle={3} variant="emerald">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>CASCADE HEALING</span>
            </PillBadge>
          </div>
        </div>
      </div>
    </section>
  );
}
