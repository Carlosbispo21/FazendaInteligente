import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES = {
  healthy: ["Estou me sentindo ótima! 🌱", "Tudo perfeito por aqui! 💚"],
  thirsty: ["Estou com sede... 💧", "Preciso de água!"],
  lowEC: ["Estou com poucos nutrientes... 🌱", "Falta adubo por aqui!"],
  cold: ["Está um pouquinho frio aqui... 🥶", "Brrr, que frio!"],
  hot: ["Está quente demais... 🥵", "Ufa, que calor!"],
  critical: ["Ei... preciso de atenção! 🌱", "Não estou me sentindo bem..."],
  sleeping: ["Zzz... descansando à noite 🌙", "Boa noite! Dormindo... 😴"],
  celebrating: ["Muito melhor agora! 🎉", "Obrigado por cuidar de mim! 💚"],
};

export default function SpeechBubble({ state, watering }) {
  const key = watering ? "celebrating" : state;
  const text = watering
    ? "Obrigado! Estou muito melhor! 💧💚"
    : MESSAGES[state]?.[0] || MESSAGES.healthy[0];

  return (
    <div className="relative flex justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="relative bg-white px-5 py-3 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] text-[15px] font-medium text-stone-700 max-w-[260px] text-center"
        >
          {text}
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 rounded-sm" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
