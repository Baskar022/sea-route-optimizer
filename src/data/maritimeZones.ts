export type RiskLevel = "Low" | "Medium" | "High";

export interface ZoneCircle {
  id: string;
  name: string;
  category: "traffic" | "weather" | "piracy" | "danger";
  riskLevel: RiskLevel;
  center: [number, number]; // [lng, lat]
  radiusNm: number;
}

export const maritimeZones: ZoneCircle[] = [
  { id: "traffic-malacca", name: "Malacca Traffic Corridor", category: "traffic", riskLevel: "High", center: [101.0, 3.0], radiusNm: 300 },
  { id: "traffic-arabian", name: "Arabian Sea Corridor", category: "traffic", riskLevel: "Medium", center: [67.0, 15.0], radiusNm: 460 },
  { id: "traffic-suez", name: "Suez Access Corridor", category: "traffic", riskLevel: "Medium", center: [32.3, 30.1], radiusNm: 280 },
  { id: "weather-bob", name: "Bay of Bengal Cyclonic Belt", category: "weather", riskLevel: "High", center: [89.0, 16.5], radiusNm: 320 },
  { id: "weather-monsoon", name: "Monsoon Pocket", category: "weather", riskLevel: "Medium", center: [90.0, 14.0], radiusNm: 560 },
  { id: "weather-scs", name: "South China Cyclonic Belt", category: "weather", riskLevel: "High", center: [122.0, 20.0], radiusNm: 390 },
  { id: "piracy-somalia", name: "Somalia Basin", category: "piracy", riskLevel: "High", center: [50.0, 12.0], radiusNm: 490 },
  { id: "piracy-guinea", name: "Gulf of Guinea", category: "piracy", riskLevel: "High", center: [3.0, 2.0], radiusNm: 340 },
  { id: "piracy-strait", name: "Strait Spillover", category: "piracy", riskLevel: "Medium", center: [102.0, 2.0], radiusNm: 200 },
  { id: "danger-andaman", name: "Andaman Exclusion Area", category: "danger", riskLevel: "Medium", center: [93.5, 11.5], radiusNm: 140 },
  { id: "danger-horn", name: "Horn of Africa Conflict Waters", category: "danger", riskLevel: "High", center: [46.0, 12.0], radiusNm: 180 },
];

export const riskColorMap: Record<RiskLevel, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ef4444",
};
