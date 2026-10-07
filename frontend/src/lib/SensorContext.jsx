import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { experimentId as defaultExperimentId, getFazenda } from "@/api/fazendaClient";
import { mapCulture, mapReadings } from "./monitoring";
import { fixedCulture } from "./fixedCulture";
import { readPreference, writePreference } from "./preferences";

const SensorContext = createContext(null);
export function SensorProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    const saved = readPreference("monitoring", {});
    return { experimentId: Number.isInteger(saved?.experimentId) && saved.experimentId > 0 ? saved.experimentId : defaultExperimentId,
      cultures: saved?.cultures && typeof saved.cultures === "object" ? saved.cultures : {} };
  });
  const experimentId = preferences.experimentId;
  const selectedCultureId = preferences.cultures[experimentId];
  const changePreferences = (update) => setPreferences((previous) => {
    const next = update(previous); writePreference("monitoring", next); return next;
  });
  const selectCulture = (id) => changePreferences((previous) => ({ ...previous, cultures: { ...previous.cultures, [experimentId]: id } }));
  const selectExperiment = (id) => {
    if (Number.isInteger(Number(id)) && Number(id) > 0) changePreferences((previous) => ({ ...previous, experimentId: Number(id) }));
  };
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const experimentQuery = useQuery({
    queryKey: ["experiments"],
    queryFn: async ({ signal }) => {
      try { return { supported: true, items: await getFazenda("/experimentos", {}, { signal }) }; }
      catch (error) { if ([404, 405].includes(error.status)) return { supported: false, items: [] }; throw error; }
    }, refetchInterval: 60000, retry: 1,
  });
  const query = useQuery({
    queryKey: ["monitoring", experimentId],
    queryFn: async ({ signal }) => {
      const params = { id_experimento: experimentId };
      const [experiment, cultures, latest] = await Promise.all([
        getFazenda(`/experimentos/${experimentId}`, {}, { signal }),
        getFazenda("/culturas", {}, { signal }),
        getFazenda("/leituras/ultima", params, { signal, optional: true }),
      ]);
      return { experiment, cultures, culture: mapCulture(cultures.find((c) => c.id_cultura === experiment.id_cultura)), latest };
    }, refetchInterval: 30000, refetchIntervalInBackground: true, retry: 1,
  });
  const data = query.data;
  const culture = (selectedCultureId && fixedCulture(selectedCultureId, data?.cultures)) || data?.culture;
  return <SensorContext.Provider value={{
    now, experimentId, experiment: data?.experiment, culture, selectCulture, selectExperiment,
    experiments: experimentQuery.data?.items || [], experimentApiSupported: experimentQuery.data?.supported,
    experimentsError: experimentQuery.error?.message, sensorCulture: data?.culture,
    cultures: data?.cultures || [], readings: mapReadings(data?.latest), latest: data?.latest, watering: false,
    loading: query.isPending, error: query.error?.message, refresh: query.refetch, fetching: query.isFetching,
  }}>{children}</SensorContext.Provider>;
}
export function useSensor() {
  const context = useContext(SensorContext);
  if (!context) throw new Error("useSensor must be used within SensorProvider");
  return context;
}