import React from "react";
import SensorLineChart from "./SensorLineChart";
export default function TemperatureChart({ data }) {
  return (
    <SensorLineChart
      data={data}
      color="#FB8C00"
      unit="°C"
      metric="temperature"
    />
  );
}
