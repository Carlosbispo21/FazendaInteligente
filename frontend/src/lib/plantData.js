export { cultureCatalog as CULTURES } from "./cultureCatalog";

export const PERIODS = [
  { id: "24h", label: "24 horas", points: 48, stepMin: 30 },
  { id: "7d", label: "7 dias", points: 84, stepMin: 120 },
  { id: "30d", label: "30 dias", points: 120, stepMin: 360 },
];

// Determina o status de um valor dentro de um intervalo ideal.
export function getStatus(value, range) {
  if (value < range[0]) {
    return value < range[0] * 0.7 ? "critical" : "low";
  }
  if (value > range[1]) {
    return value > range[1] * 1.15 ? "critical" : "high";
  }
  return "ideal";
}

export const STATUS_META = {
  unknown: { label: "Sem limites", color: "#78716c", soft: "#f5f5f4" },
  ideal: { label: "Ideal", color: "#43A047", soft: "#E8F5E9" },
  low: { label: "Abaixo", color: "#FBC02D", soft: "#FFF8E1" },
  high: { label: "Acima", color: "#FB8C00", soft: "#FFF3E0" },
  critical: { label: "Crítico", color: "#E57373", soft: "#FFEBEE" },
};

// Determina o estado da mascote a partir das leituras e da cultura.
export function computePlantState(readings, culture) {
  const r = culture.ranges;
  const issues = [];
  const hStatus = getStatus(readings.humidity, r.humidity);
  const eStatus = getStatus(readings.ec, r.ec);
  const tStatus = getStatus(readings.temperature, r.temperature);

  if (hStatus !== "ideal") issues.push({ metric: "humidity", status: hStatus });
  if (eStatus !== "ideal") issues.push({ metric: "ec", status: eStatus });
  if (tStatus !== "ideal")
    issues.push({ metric: "temperature", status: tStatus });

  if (issues.length >= 2) return { state: "critical", issues };

  if (readings.humidity < r.humidity[0])
    return { state: "thirsty", issues };
  if (readings.ec < r.ec[0])
    return { state: "lowEC", issues };
  if (readings.temperature < r.temperature[0]) return { state: "cold", issues };
  if (readings.temperature > r.temperature[1]) return { state: "hot", issues };

  return { state: "healthy", issues: [] };
}

// Score de saúde 0-100
export function computeHealthScore(readings, culture) {
  const r = culture.ranges;
  let score = 100;
  const penalize = (val, range) => {
    if (val < range[0]) return Math.round(((range[0] - val) / range[0]) * 100);
    if (val > range[1]) return Math.round(((val - range[1]) / range[1]) * 100);
    return 0;
  };
  score -= penalize(readings.humidity, r.humidity) * 1.2;
  score -= penalize(readings.ec, r.ec);
  score -= penalize(readings.temperature, r.temperature);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthLabel(score) {
  if (score >= 85) return { label: "Excelente", color: "#43A047" };
  if (score >= 65) return { label: "Boa", color: "#7CB342" };
  if (score >= 40) return { label: "Atenção", color: "#FBC02D" };
  return { label: "Crítica", color: "#E57373" };
}

// Gera série histórica realista para um período.
export function generateSeries(periodId, metric, culture) {
  const period = PERIODS.find((p) => p.id === periodId);
  const range = culture.ranges[metric];
  const base = (range[0] + range[1]) / 2;
  const amp = (range[1] - range[0]) / 2;
  const now = new Date();
  const points = [];
  for (let i = period.points - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * period.stepMin * 60 * 1000);
    // ondas + ruído + uma queda simulada para umidade
    const phase = (i / period.points) * Math.PI * 4;
    let value =
      base + Math.sin(phase) * amp * 0.5 + (Math.random() - 0.5) * amp * 0.4;
    if (metric === "humidity") {
      value -= Math.max(0, (period.points - i - 18) * 0.4); // queda gradual
      if (i < 6) value += (6 - i) * 1.2; // recuperação após rega
    }
    if (metric === "temperature") {
      value += Math.sin((t.getHours() / 24) * Math.PI * 2) * amp * 0.6;
    }
    value = Math.round(value * 10) / 10;
    points.push({
      time: t,
      label: formatLabel(t, periodId),
      value,
      status: getStatus(value, range),
    });
  }
  return points;
}

function formatLabel(t, periodId) {
  const pad = (n) => String(n).padStart(2, "0");
  if (periodId === "24h") return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  if (periodId === "7d") {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return `${days[t.getDay()]} ${pad(t.getHours())}h`;
  }
  return `${pad(t.getDate())}/${pad(t.getMonth() + 1)}`;
}

// Eventos mockados do dia
export function generateEvents() {
  return [
    { time: "08:30", icon: "💧", text: "Umidade começou a cair", tone: "blue" },
    {
      time: "10:00",
      icon: "⚠️",
      text: "Planta entrou em estado de atenção",
      tone: "yellow",
    },
    { time: "12:30", icon: "💧", text: "Recomendação de rega", tone: "blue" },
    {
      time: "13:00",
      icon: "🌱",
      text: "Planta voltou ao nível ideal",
      tone: "green",
    },
  ];
}
