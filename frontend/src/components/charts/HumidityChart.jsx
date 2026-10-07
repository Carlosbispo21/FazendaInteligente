import React from "react";
import SensorLineChart from "./SensorLineChart";

export default function HumidityChart({ data }) {
  return <SensorLineChart data={data} color="#4FC3F7" unit="%" metric="humidity" />;
}
