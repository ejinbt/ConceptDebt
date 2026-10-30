import { useRef, ReactNode } from "react";
import gsap from "gsap";

interface CardTilt3DProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}

export function CardTilt3D({
  children,
  className = "",
  maxTilt = 7,
}: CardTilt3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width - 0.5) * 2; // -1 to 1
    const yPct = (y / rect.height - 0.5) * 2; // -1 to 1

    const tiltX = -yPct * maxTilt;
    const tiltY = xPct * maxTilt;

    gsap.to(cardRef.current, {
      rotateX: tiltX,
      rotateY: tiltY,
      transformPerspective: 1200,
      scale: 1.015,
      duration: 0.35,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.8,
      ease: "elastic.out(1, 0.35)",
    });
  };

  return (
    <div style={{ perspective: "1200px" }} className="w-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`transform-gpu transition-shadow duration-300 ${className}`}
        style={{ willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
