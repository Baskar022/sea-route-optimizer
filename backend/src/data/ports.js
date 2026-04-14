import { readFileSync } from "node:fs";

const portsDataset = JSON.parse(readFileSync(new URL("./ports.json", import.meta.url), "utf-8"));

export const PORTS_BY_COUNTRY = portsDataset.reduce((acc, port) => {
  if (!acc[port.country]) {
    acc[port.country] = [];
  }

  acc[port.country].push({
    name: port.portName,
    lat: port.lat,
    lng: port.lng,
    draftLimitM: port.draftLimitM,
    fuelPriceMultiplier: port.fuelPriceMultiplier,
    congestionLevel: port.congestionLevel,
  });

  return acc;
}, {});

const PORT_ALIASES = {
  "Mumbai, India": "Mumbai Port",
  "Chennai, India": "Chennai Port",
  "Kochi, India": "Kochi Port",
  "Visakhapatnam, India": "Visakhapatnam Port",
  "Kolkata, India": "Kandla Port",
  "Dubai, UAE": "Jebel Ali Port",
  "Singapore": "Port of Singapore",
  "Shanghai, China": "Port of Shanghai",
  "Rotterdam, Netherlands": "Port of Rotterdam",
  "Hamburg, Germany": "Port of Hamburg",
};

export const PORT_COORDINATES = Object.values(PORTS_BY_COUNTRY)
  .flat()
  .reduce((acc, port) => {
    acc[port.name] = { lat: port.lat, lng: port.lng };
    return acc;
  }, {});

Object.entries(PORT_ALIASES).forEach(([alias, canonical]) => {
  if (PORT_COORDINATES[canonical]) {
    PORT_COORDINATES[alias] = PORT_COORDINATES[canonical];
  }
});

export const SHIP_PROFILES = {
  "Container Ship": { fuelTonPerNm: 0.065, defaultSpeedKnots: 18 },
  "Bulk Carrier": { fuelTonPerNm: 0.052, defaultSpeedKnots: 14 },
  Tanker: { fuelTonPerNm: 0.071, defaultSpeedKnots: 15 },
  "General Cargo": { fuelTonPerNm: 0.048, defaultSpeedKnots: 13 },
  "RoRo Vessel": { fuelTonPerNm: 0.057, defaultSpeedKnots: 17 },
};

export const DEFAULT_SHIP_PROFILE = SHIP_PROFILES["Container Ship"];
