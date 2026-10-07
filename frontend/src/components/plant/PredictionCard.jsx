import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Thermometer, Zap } from 'lucide-react';

// Card de previsão de rega com contagem regressiva animada.
export default function PredictionCard({ hours = 18, minutes = 32 }) {
  const totalMin = hours * 60 + minutes;
  const [remaining, setRemaining] = useState(totalMin);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : totalMin));
    }, 3000); // simulação acelerada para demo
    return () => clearInterval(id);
  }, [totalMin]);

  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  const pct = 1 - remaining / totalMin;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E3F2FD] to-[#F1F8E9] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 text-sky-600 font-semibold text-sm">
        <Droplets size={18} /> Próxima rega
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className="text-5xl font-bold text-stone-800 tabular-nums">{String(h).padStart(2, '0')}</span>
        <span className="text-2xl font-bold text-stone-400 mb-1">h</span>
        <span className="text-5xl font-bold text-stone-800 tabular-nums ml-2">{String(m).padStart(2, '0')}</span>
        <span className="text-2xl font-bold text-stone-400 mb-1">min</span>
      </div>
      <p className="mt-2 text-sm text-stone-500">
        Baseado no histórico de umidade e na temperatura atual.
      </p>
      <div className="mt-4 h-2 w-full rounded-full bg-white/60 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-sky-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-stone-400 font-medium">
        <span>Agora</span>
        <span>Umidade atual</span>
        <span>Queda estimada</span>
        <span>Nível crítico</span>
        <span className="text-sky-600 font-semibold">Rega</span>
      </div>
    </div>
  );
}

export function ForecastMini({ icon: Icon, title, text, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-stone-100"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}1A` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div className="text-sm font-semibold text-stone-700">{title}</div>
        <div className="text-[13px] text-stone-500 mt-0.5">{text}</div>
      </div>
    </motion.div>
  );
}