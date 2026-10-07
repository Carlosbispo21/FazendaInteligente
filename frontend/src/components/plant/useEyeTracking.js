import { useEffect, useRef, useState } from "react";

// Rastreia a posição do cursor (mouse ou toque) relativa a um elemento SVG,
// retornando um offset normalizado (-1 a 1) em x/y e um flag de piscada.
export default function useEyeTracking(svgRef, { blinkInterval = 4200 } = {}) {
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    const svg = svgRef?.current;
    if (!svg) return;

    const update = (clientX, clientY) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = svg.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.38; // centro aproximado dos olhos
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const max = Math.max(rect.width, 240);
        const nx = Math.max(-1, Math.min(1, dx / max));
        const ny = Math.max(-1, Math.min(1, dy / max));
        setPupil({ x: nx, y: ny, dist });
      });
    };

    const onMouseMove = (e) => update(e.clientX, e.clientY);
    const onClick = (e) => update(e.clientX, e.clientY);
    const onTouch = (e) => {
      const t = e.touches?.[0];
      if (t) update(t.clientX, t.clientY);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchstart", onTouch);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [svgRef]);

  // piscada periódica leve
  useEffect(() => {
    let t1, t2;
    const tick = () => {
      setBlinking(true);
      t2 = setTimeout(() => setBlinking(false), 130);
      t1 = setTimeout(tick, blinkInterval + Math.random() * 1800);
    };
    t1 = setTimeout(tick, blinkInterval);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [blinkInterval]);

  return { pupil, blinking };
}
