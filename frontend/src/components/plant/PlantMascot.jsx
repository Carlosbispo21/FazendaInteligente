import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useEyeTracking from "./useEyeTracking";
import { mascotExpressions } from "./mascotExpressions";

const healthyExpressions = ["attentive", "excited", "happy", "surprised", "neutral"]
  .filter((name) => mascotExpressions[name]);

export default function BloubMascot({
  state = "healthy",
  culture,
  readings,
  watering = false,
  size = 280,
}) {
  const svgRef = useRef(null);
  const isHot = !watering && state !== "celebrating" && (state === "hot" ||
    (readings && culture && readings.temperature > culture.ranges.temperature[1]));
  const isCold = !watering && state !== "celebrating" && (state === "cold" ||
    (readings && culture && readings.temperature < culture.ranges.temperature[0]));
  const isThirsty = !watering && (state === "thirsty" ||
    (readings && culture && readings.humidity < culture.ranges.humidity[0]));
  const isLowEC = !watering && state !== "celebrating" && (state === "lowEC" ||
    (readings && culture && readings.ec < culture.ranges.ec[0]));
  const [idleExpression, setIdleExpression] = useState("attentive");
  const canCycle = state === "healthy" && !isThirsty && !isHot && !isCold && !isLowEC && !watering;

  useEffect(() => {
    if (!canCycle || healthyExpressions.length < 2) return;

    let timer;
    const scheduleNext = () => {
      timer = setTimeout(() => {
        setIdleExpression((previous) => {
          const choices = healthyExpressions.filter((name) => name !== previous);
          return choices[Math.floor(Math.random() * choices.length)];
        });
        scheduleNext();
      }, 1500 + Math.random() * 3500);
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, [canCycle]);

  const expressionName = isHot ? "angry" : isCold ? "suspicious" : isThirsty ? "sad"
    : isLowEC ? "confused"
    : watering || state === "celebrating" ? "excited"
    : canCycle ? idleExpression : "attentive";
  const expression = mascotExpressions[expressionName];
  const { pupil = { x: 0, y: 0 }, blinking = false } =
    useEyeTracking(svgRef) || {};
  const bodyAnim = {
    healthy: {
      y: [0, -3, 0],
      transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
    },
    thirsty: {
      y: [0, 1.5, 0],
      rotate: [0, -1.5, 0],
      transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
    },
    lowEC: {
      y: [0, 1, 0],
      transition: { duration: 3.8, repeat: Infinity, ease: "easeInOut" },
    },
    cold: {
      x: [0, -2, 2, -1.5, 1, 0],
      transition: { duration: 0.45, repeat: Infinity },
    },
    hot: {
      y: [0, -1.5, 0],
      transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
    },
    critical: {
      y: [0, 1.5, 0],
      rotate: [0, -2, 0],
      transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
    },
    celebrating: {
      y: [0, -7, 0],
      rotate: [0, 3, -3, 0],
      transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
    },
  }[isHot ? "hot" : isCold ? "cold" : isThirsty ? "thirsty" : isLowEC ? "lowEC" : state] || { y: [0, 0, 0] };
  const stateColors = {
    healthy: "#2fbfa0",
    thirsty: "#5b9bd5",
    lowEC: "#facc15",
    cold: "#38bdf8",
    hot: "#ef4444",
    critical: "#4b5563",
    celebrating: "#ec4899",
  };
  const currentColor = isHot ? stateColors.hot : isCold ? stateColors.cold : isThirsty ? stateColors.thirsty
    : isLowEC ? stateColors.lowEC : stateColors[state] || stateColors.healthy;

  return (
    <div
      className="relative flex justify-center items-center"
      ref={svgRef}
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={bodyAnim}
        style={{ transformOrigin: "50% 100%", width: "100%", height: "100%" }}
        className="relative"
      >
        
        <svg
          width="100%"
          height="100%"
          viewBox="-125 -125 250 250"
          role="img"
          aria-label={isHot ? "Mascote Bloub irritado e com calor" : isCold ? "Mascote Bloub desconfiado e tremendo de frio" : isThirsty ? "Mascote Bloub triste e com sede"
            : isLowEC ? "Mascote Bloub confuso com CE baixo" : `Mascote Bloub: ${expressionName}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          
          <motion.path
            animate={{ fill: currentColor }}
            transition={{ duration: 0.8 }}
            d={expression.body}
          />

          
          <motion.g
            animate={{ x: pupil.x * 5, y: pupil.y * 4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.g
                key={expressionName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {expression.eyes.map((eye, index) => (
                  <g key={index} transform={eye.transform}>
                    <motion.g
                      animate={{ scaleY: blinking ? 0.06 : 1 }}
                      transition={{ duration: blinking ? 0.07 : 0.14, ease: "easeInOut" }}
                      style={{ transformOrigin: "0px 0px" }}
                    >
                      <path d={eye.path} fill="#f9f9f9" />
                    </motion.g>
                  </g>
                ))}
              </motion.g>
            </AnimatePresence>
          </motion.g>
        </svg>

        
        <AnimatePresence>
          {watering &&
            [0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={`water-${i}`}
                className="absolute rounded-full bg-sky-400"
                style={{
                  left: `${20 + i * 15}%`,
                  top: "-4%",
                  width: 8,
                  height: 12,
                }}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: [0, 90], opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeIn",
                }}
              />
            ))}
        </AnimatePresence>

        <AnimatePresence>
          {isHot &&
            [0, 1, 2, 3].map((i) => (
              <motion.span
                key={`sweat-${i}`}
                aria-hidden="true"
                className="pointer-events-none absolute bg-sky-400"
                style={{
                  left: i % 2 === 0 ? "10%" : "87%",
                  top: i < 2 ? "30%" : "42%",
                  width: 8,
                  height: 12,
                  borderRadius: "70% 30% 65% 35%",
                }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: [0, 24], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35, ease: "easeIn" }}
              />
            ))}
        </AnimatePresence>

        <AnimatePresence>
          {isCold &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={`cold-${i}`}
                className="absolute rounded-full bg-sky-200 border border-sky-400"
                style={{
                  left: `${22 + i * 26}%`,
                  top: "10%",
                  width: 8,
                  height: 8,
                }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: [0, 1, 0], y: [24, 4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6 }}
              />
            ))}
        </AnimatePresence>

        <AnimatePresence>
          {state === "celebrating" &&
            [0, 1, 2, 3, 4, 5].map((i) => (
              <motion.span
                key={`conf-${i}`}
                className="absolute rounded-sm"
                style={{
                  left: `${18 + i * 13}%`,
                  top: "18%",
                  width: 7,
                  height: 7,
                  background: [
                    "#FDD835",
                    "#EC407A",
                    "#42A5F5",
                    "#66BB6A",
                    "#FF7043",
                    "#AB47BC",
                  ][i],
                }}
                initial={{ opacity: 0, rotate: 0, y: 0 }}
                animate={{ y: [0, -34, 0], opacity: [0, 1, 0], rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: i * 0.12,
                }}
              />
            ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
