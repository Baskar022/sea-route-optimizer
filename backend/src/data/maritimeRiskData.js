import { readFileSync } from "node:fs";

const trafficDataset = JSON.parse(readFileSync(new URL("./zones_traffic.json", import.meta.url), "utf-8"));
const weatherDataset = JSON.parse(readFileSync(new URL("./zones_weather.json", import.meta.url), "utf-8"));
const piracyDataset = JSON.parse(readFileSync(new URL("./zones_piracy.json", import.meta.url), "utf-8"));
const dangerDataset = JSON.parse(readFileSync(new URL("./zones_danger.json", import.meta.url), "utf-8"));

const riskLevelToWeight = {
  Low: 0.35,
  Medium: 0.65,
  High: 1,
};

const normalizeZone = (zone, valueKey, category) => ({
  id: zone.id,
  name: zone.name,
  category,
  center: [zone.centerLng, zone.centerLat],
  radiusNm: zone.radiusNm,
  riskLevel: zone.riskLevel,
  [valueKey]: Number(zone[valueKey] ?? riskLevelToWeight[zone.riskLevel] ?? 0.5),
});

export const TRAFFIC_ZONES = trafficDataset.map((zone) =>
  normalizeZone(zone, "intensity", "traffic")
);

export const WEATHER_SYSTEMS = weatherDataset.map((zone) =>
  normalizeZone(zone, "severity", "weather")
);

export const PIRACY_ZONES = piracyDataset.map((zone) =>
  normalizeZone(zone, "intensity", "piracy")
);

export const DANGER_ZONES = dangerDataset.map((zone) => ({
  ...normalizeZone(zone, "penalty", "danger"),
  reason: zone.reason,
  penalty: Number(zone.penalty || 7000),
}));

export const SOLID_AREAS = [];
export const PORT_BUFFER_NM = 85;

export const FUEL_PRICE_ZONES = [
  { name: "Singapore Bunkering", center: [103.85, 1.29], radiusNm: 260, multiplier: 0.88 },
  { name: "Middle East Fuel Hub", center: [55.06, 25.01], radiusNm: 280, multiplier: 0.96 },
  { name: "North Sea Premium Fuel", center: [4.14, 51.95], radiusNm: 320, multiplier: 1.16 },
  { name: "US Pacific Premium Fuel", center: [-118.24, 33.74], radiusNm: 360, multiplier: 1.12 },
];

export const BASE_FUEL_PRICE_PER_TON_USD = 650;
