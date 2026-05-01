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
  // Indian ports
  "Mumbai, India": "Mumbai Port",
  "Mormugao, India": "Mumbai Port",
  "Chennai, India": "Chennai Port",
  "Kochi, India": "Kochi Port",
  "Visakhapatnam, India": "Visakhapatnam Port",
  "Kolkata, India": "Kandla Port",
  
  // Middle East ports
  "Dubai, UAE": "Jebel Ali Port",
  "Abu Dhabi, UAE": "Jebel Ali Port",
  "Muscat, Oman": "Port of Fujairah",
  
  // SE Asia ports
  "Singapore": "Port of Singapore",
  "Singapore Port": "Port of Singapore",
  "Port Singapore": "Port of Singapore",
  
  // China ports
  "Shanghai, China": "Port of Shanghai",
  "Shanghai Port": "Port of Shanghai",
  "Port Shanghai": "Port of Shanghai",
  "Shenzhen, China": "Port of Shenzhen",
  "Shenzhen Port": "Port of Shenzhen",
  "Qingdao, China": "Port of Ningbo-Zhoushan",
  "Qingdao Port": "Port of Ningbo-Zhoushan",
  
  // Europe ports
  "Rotterdam, Netherlands": "Port of Rotterdam",
  "Rotterdam Port": "Port of Rotterdam",
  "Hamburg, Germany": "Port of Hamburg",
  "Hamburg Port": "Port of Hamburg",
  
  // Africa ports
  "Alexandria, Egypt": "Port of Alexandria",
  "Alexandria Port": "Port of Alexandria",
  "Mombasa, Kenya": "Port of Durban",
  "Mombasa Port": "Port of Durban",
  "Cape Town, South Africa": "Port of Durban",
  "Cape Town Port": "Port of Durban",
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
