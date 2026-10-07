import React from "react";
import SensorLineChart from "./SensorLineChart";
export default function ECChart({ data }) {
  return (
    <SensorLineChart data={data} color="#FBC02D" unit=" µS/cm" metric="ec" />
  );
}
