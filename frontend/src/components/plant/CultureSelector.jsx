import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { CULTURES } from "@/lib/plantData";

export default function CultureSelector({ selectedId, onSelect, cultures = CULTURES }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {cultures.map((c, i) => {
        const active = c.id === selectedId;
        return (
          <motion.button
            key={c.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(c.id)}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative flex flex-col items-center gap-1 rounded-3xl border bg-white px-3 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-colors"
            style={{
              borderColor: active ? c.color : "#F1F5F4",
              borderWidth: active ? 2 : 1,
            }}
          >
            {active && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white"
                style={{ background: c.color }}
              >
                <Check size={13} strokeWidth={3} />
              </motion.span>
            )}
            <motion.span
              className="text-4xl"
              whileHover={{ y: -3, rotate: active ? 0 : -6 }}
              animate={active ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.6 }}
            >
              {c.emoji}
            </motion.span>
            <span className="text-sm font-semibold text-stone-700">
              {c.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
