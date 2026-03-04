import { useState, useEffect } from "react";
import { motion } from "motion/react";

export function InteractiveBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState(() => {
    const initParticles = [];
    const particleCount = 24;

    for (let i = 0; i < particleCount; i++) {
      initParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5, // Reduced: 0.5-2.5px (was 1-5px)
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.16 + 0.08, // Slight bump for better visibility
        blur: 0, // Removed blur for performance
      });
    }

    return initParticles;
  });

  // Mouse move handler
  useEffect(() => {
    let rafId;
    let lastUpdateTime = 0;
    const throttleDelay = 50; // Update every 50ms max

    const handleMouseMove = (e) => {
      const currentTime = Date.now();
      
      if (currentTime - lastUpdateTime < throttleDelay) {
        return;
      }

      lastUpdateTime = currentTime;
      
      rafId = requestAnimationFrame(() => {
        const x = (e.clientX - window.innerWidth / 2) / window.innerWidth;
        const y = (e.clientY - window.innerHeight / 2) / window.innerHeight;
        setMousePosition({ x, y });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev.map((particle) => {
          let newX = particle.x + particle.speedX;
          let newY = particle.y + particle.speedY;

          // Wrap around edges
          if (newX < -5) newX = 105;
          if (newX > 105) newX = -5;
          if (newY < -5) newY = 105;
          if (newY > 105) newY = -5;

          return {
            ...particle,
            x: newX,
            y: newY,
          };
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-gray-800" />

      {/* Grid overlay - More visible */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.11) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => {
        // Calculate distance from mouse for interaction
        const distX = (mousePosition.x * 50) - particle.x;
        const distY = (mousePosition.y * 50) - particle.y;
        const distance = Math.sqrt(distX * distX + distY * distY);
        const repelStrength = Math.max(0, 30 - distance) / 30;

        return (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              willChange: 'transform',
            }}
            animate={{
              x: mousePosition.x * -30 + (repelStrength * distX * -2),
              y: mousePosition.y * -30 + (repelStrength * distY * -2),
            }}
            transition={{
              type: "tween",
              duration: 0.3,
              ease: "easeOut",
            }}
          />
        );
      })}

      {/* Radial gradient overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
        }}
      />

      {/* Corner accent lines */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-white/15" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-white/15" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-white/15" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-white/15" />
    </div>
  );
}
