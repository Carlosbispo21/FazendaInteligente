import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, Droplets, Zap, Thermometer, X } from "lucide-react";

// Modo discreto de simulação de sensores — essencial para a apresentação do TCC.
export default function SimulatePanel({ readings, updateReading, culture }) {
  const [open, setOpen] = useState(false);
  const r = culture.ranges;

  const fields = [
    {
      key: "humidity",
      label: "Umidade",
      icon: Droplets,
      color: "#4FC3F7",
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      key: "ec",
      label: "CE",
      icon: Zap,
      color: "#FBC02D",
      min: 0,
      max: 4000,
      step: 100,
      unit: " µS/cm",
    },
    {
      key: "temperature",
      label: "Temperatura",
      icon: Thermometer,
      color: "#FB8C00",
      min: 0,
      max: 40,
      step: 0.5,
      unit: "°C",
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 z-40 flex items-center gap-2 rounded-full bg-stone-800 px-4 py-2.5 text-white text-sm font-medium shadow-lg hover:bg-stone-700 transition-colors"
      >
        <Sliders size={16} /> Simular sensores
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed right-0 top-0 z-50 h-full w-[88%] max-w-sm bg-white p-6 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-800">
                  Simular sensores
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-stone-500 mt-1">
                Altere os valores e veja a mascote reagir em tempo real.
              </p>

              <div className="mt-6 space-y-6">
                {fields.map((f) => {
                  const Icon = f.icon;
                  const ideal = r[f.key];
                  return (
                    <div key={f.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={16} style={{ color: f.color }} />
                        <span className="text-sm font-semibold text-stone-700">
                          {f.label}
                        </span>
                        <span
                          className="ml-auto text-sm font-bold tabular-nums"
                          style={{ color: f.color }}
                        >
                          {readings[f.key]}
                          {f.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        value={readings[f.key]}
                        onChange={(e) =>
                          updateReading(f.key, parseFloat(e.target.value))
                        }
                        className="w-full accent-stone-700"
                        style={{ accentColor: f.color }}
                      />
                      <div className="flex justify-between text-[11px] text-stone-400 mt-1">
                        <span>
                          {f.min}
                          {f.unit}
                        </span>
                        <span className="text-emerald-600 font-medium">
                          Ideal: {ideal[0]}–{ideal[1]}
                          {f.unit}
                        </span>
                        <span>
                          {f.max}
                          {f.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl bg-stone-50 p-3 text-[12px] text-stone-500">
                Dica: diminua a umidade para ver a planta murchar; aumente a
                temperatura para vê-la suar.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
