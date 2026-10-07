import React from "react";
import { motion } from "framer-motion";

const TONE = {
  blue: { bg: "#E3F2FD", dot: "#4FC3F7" },
  yellow: { bg: "#FFF8E1", dot: "#FBC02D" },
  green: { bg: "#E8F5E9", dot: "#43A047" },
};

export default function EventTimeline({ events }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-[10px] top-2 bottom-2 w-px bg-stone-200" />
      <div className="space-y-4">
        {events.map((e, i) => {
          const tone = TONE[e.tone] || TONE.green;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="relative flex items-center gap-3"
            >
              <span
                className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                style={{ background: tone.bg }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: tone.dot }}
                />
              </span>
              <span className="text-xs font-semibold text-stone-400 tabular-nums w-24 shrink-0">
                {e.time}
              </span>
              <span className="text-base">{e.icon}</span>
              <span className="text-sm text-stone-600">{e.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
