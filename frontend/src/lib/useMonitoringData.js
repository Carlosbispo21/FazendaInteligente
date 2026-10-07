import { useQuery } from "@tanstack/react-query";
import { getFazenda } from "@/api/fazendaClient";
import { useSensor } from "./SensorContext";

export function useHistory(period) {
  const { experimentId } = useSensor();
  return useQuery({
    queryKey: ["history", experimentId, period],
    queryFn: ({ signal }) => getFazenda("/leituras", {
      id_experimento: experimentId,
      inicio: new Date(Date.now() - ({ "24h": 1, "48h": 2, "7d": 7, "30d": 30 }[period]) * 86400000).toISOString(),
      limite: 10000,
    }, { signal }),
    refetchInterval: 30000, retry: 1,
  });
}

export function useAnalysis() {
  const { experimentId } = useSensor();
  return useQuery({
    queryKey: ["analysis", experimentId],
    queryFn: async ({ signal }) => {
      const params = { id_experimento: experimentId };
      const [forecast, metrics, alerts, waterings] = await Promise.all([
        getFazenda("/predicoes", params, { signal }),
        getFazenda("/modelo/metricas", params, { signal }),
        getFazenda("/alertas", params, { signal }),
        getFazenda("/regas", params, { signal }),
      ]);
      return { forecast, metrics, alerts, waterings };
    },
    refetchInterval: 60000, retry: 1,
  });
}
