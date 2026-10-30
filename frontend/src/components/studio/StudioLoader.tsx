import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface StudioLoaderProps {
  onComplete?: () => void;
}

export function StudioLoader({ onComplete }: StudioLoaderProps) {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run if not already shown this session
    const hasLoaded = sessionStorage.getItem("concept_debt_loader_seen");
    if (hasLoaded) {
      setVisible(false);
      if (onComplete) onComplete();
      return;
    }

    const path = pathRef.current;
    const container = containerRef.current;
    const counter = counterRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;

    if (!path || !container || !counter || !title) return;

    const length = path.getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
      visibility: "visible",
    });

    const countObj = { val: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem("concept_debt_loader_seen", "true");
        gsap.to(container, {
          yPercent: -100,
          duration: 0.9,
          ease: "power4.inOut",
          onComplete: () => {
            setVisible(false);
            if (onComplete) onComplete();
          },
        });
      },
    });

    // 1. Counter increment
    tl.to(countObj, {
      val: 100,
      duration: 1.8,
      ease: "power2.out",
      onUpdate: () => {
        if (counter) {
          counter.textContent = String(Math.floor(countObj.val)).padStart(3, "0") + "%";
        }
      },
    }, 0);

    // 2. Serpentine circuit path stroke animation
    tl.to(path, {
      strokeDashoffset: 0,
      duration: 1.6,
      ease: "power2.inOut",
    }, 0);

    // 3. Title reveal
    tl.fromTo(title, {
      y: 30,
      opacity: 0,
    }, {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power3.out",
    }, 0.5);

    if (subtitle) {
      tl.fromTo(subtitle, {
        opacity: 0,
      }, {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
      }, 0.8);
    }

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  if (!visible) return null;

  const handleSkip = () => {
    sessionStorage.setItem("concept_debt_loader_seen", "true");
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        yPercent: -100,
        duration: 0.4,
        ease: "power3.in",
        onComplete: () => {
          setVisible(false);
          if (onComplete) onComplete();
        },
      });
    } else {
      setVisible(false);
      if (onComplete) onComplete();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#0E0E10] text-[#F3F3F4] flex flex-col justify-between p-8 sm:p-14 select-none border-b-2 border-[#6A040F]"
      style={{ willChange: "transform" }}
    >
      {/* Top telemetry */}
      <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-[#9E9EA7]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D00000] animate-pulse" />
          <span>CONCEPT_DEBT // ARCHITECTURE</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSkip}
            className="hover:text-white transition-colors uppercase text-[11px] underline underline-offset-4 cursor-pointer"
          >
            [Skip Intro]
          </button>
          <span ref={counterRef} className="font-bold text-[#D00000] text-sm">
            000%
          </span>
        </div>
      </div>

      {/* Center Serpentine Circuit Path & Heading */}
      <div className="flex flex-col items-center justify-center my-auto text-center px-4">
        <svg
          className="w-72 h-32 sm:w-[440px] sm:h-44 overflow-visible mb-6"
          viewBox="0 0 440 180"
          fill="none"
        >
          {/* Subtle guide track */}
          <path
            d="M 20 90 C 110 10, 160 170, 220 90 C 280 10, 330 170, 420 90"
            stroke="#2A2A2F"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Active illuminated path */}
          <path
            ref={pathRef}
            d="M 20 90 C 110 10, 160 170, 220 90 C 280 10, 330 170, 420 90"
            stroke="url(#crimsonGradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="crimsonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D00000" />
              <stop offset="50%" stopColor="#ff2a55" />
              <stop offset="100%" stopColor="#F3F3F4" />
            </linearGradient>
          </defs>
        </svg>

        <h2
          ref={titleRef}
          className="text-4xl sm:text-6xl font-display font-black uppercase tracking-tight text-[#F3F3F4]"
        >
          TRACING <span className="text-[#D00000]">PREREQUISITE BUGS</span>
        </h2>

        <div
          ref={subtitleRef}
          className="mt-4 text-xs sm:text-sm font-mono text-[#9E9EA7] tracking-wider uppercase max-w-md"
        >
          Initializing NCERT Knowledge Graph & Prerequisite Propagation Engine
        </div>
      </div>

      {/* Bottom telemetry */}
      <div className="flex justify-between items-center text-[10px] sm:text-xs uppercase tracking-widest font-mono text-[#5B6275]">
        <span>NCERT CURRICULUM LEVEL 0-5</span>
        <span className="hidden sm:inline">MATHEMATICAL MOTION ENGINE V1.0</span>
        <span>AESTHETIC: VELVET CRONOS</span>
      </div>
    </div>
  );
}
