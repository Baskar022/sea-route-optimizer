import { DEFAULT_SHIP_PROFILE, PORT_COORDINATES, SHIP_PROFILES } from "../data/ports.js";
import {
  BASE_FUEL_PRICE_PER_TON_USD,
  DANGER_ZONES,
  FUEL_PRICE_ZONES,
  PIRACY_ZONES,
  PORT_BUFFER_NM,
  TRAFFIC_ZONES,
  WEATHER_SYSTEMS,
} from "../data/maritimeRiskData.js";
import { clamp, distanceToZoneFactor, formatEta, haversineNm, isLand } from "../utils/geo.js";
import { coordsToWaypoints, smoothRouteCoordinates } from "./routeSmoothingService.js";

const ROUTE_TYPES = [
  "Fastest Route",
  "Most Fuel Efficient",
  "Lowest Cost",
  "Balanced Optimization",
];

const STRATEGY_PRESETS = {
  "Fastest Route": {
    weights: { distance: 0.62, fuel: 0.08, weather: 0.1, traffic: 0.12, piracy: 0.08 },
    speedFactor: 1.14,
    fuelBurnFactor: 1.18,
    costFactor: 1.06,
    offsetNm: 28,
    safetyBias: 0.85,
  },
  "Most Fuel Efficient": {
    weights: { distance: 0.1, fuel: 0.66, weather: 0.09, traffic: 0.08, piracy: 0.07 },
    speedFactor: 0.84,
    fuelBurnFactor: 0.74,
    costFactor: 0.93,
    offsetNm: 58,
    safetyBias: 1.0,
  },
  "Lowest Cost": {
    weights: { distance: 0.08, fuel: 0.7, weather: 0.08, traffic: 0.07, piracy: 0.07 },
    speedFactor: 0.78,
    fuelBurnFactor: 0.7,
    costFactor: 0.68,
    offsetNm: 44,
    safetyBias: 1.0,
  },
  "Balanced Optimization": {
    weights: { distance: 0.25, fuel: 0.25, weather: 0.2, traffic: 0.15, piracy: 0.15 },
    speedFactor: 0.98,
    fuelBurnFactor: 0.94,
    costFactor: 0.92,
    offsetNm: 40,
    safetyBias: 1.05,
  },
};

const round = (value, precision = 2) => Number(value.toFixed(precision));

const zoneScore = (point, zones, intensityKey) => {
  const score = zones.reduce((acc, zone) => {
    const factor = distanceToZoneFactor(point, zone.center, zone.radiusNm);
    return acc + factor * zone[intensityKey];
  }, 0);
  return clamp(score, 0, 1);
};

const expandedZoneScore = (point, zones, intensityKey, expansion = 1.12) => {
  const score = zones.reduce((acc, zone) => {
    const factor = distanceToZoneFactor(point, zone.center, zone.radiusNm * expansion);
    return acc + factor * zone[intensityKey];
  }, 0);
  return clamp(score, 0, 1.35);
};

const expandedZonePenalty = (point, zones, valueKey, expansion = 1.05) =>
  zones.reduce((acc, zone) => {
    const factor = distanceToZoneFactor(point, zone.center, zone.radiusNm * expansion);
    return acc + factor * Number(zone[valueKey] || 0);
  }, 0);

const getFuelMultiplier = (point) => {
  const weighted = FUEL_PRICE_ZONES.reduce((acc, zone) => {
    const factor = distanceToZoneFactor(point, zone.center, zone.radiusNm);
    return acc + factor * zone.multiplier;
  }, 0);

  return weighted > 0 ? clamp(weighted, 0.82, 1.32) : 1;
};

const pointInSolidArea = (point) => isLand(point[1], point[0]);

const pointNearAnyPort = (point, portNames, radiusNm = PORT_BUFFER_NM) =>
  portNames.some((portName) => {
    const port = PORT_COORDINATES[portName];
    if (!port) return false;
    return haversineNm(point, [port.lng, port.lat]) <= radiusNm;
  });

const segmentBlocked = (fromPoint, toPoint, routeStart, routeEnd, _safetyBias) => {
  const samples = Array.from({ length: 14 }, (_, idx) => {
    const t = (idx + 1) / 15;
    return [
      fromPoint[0] + (toPoint[0] - fromPoint[0]) * t,
      fromPoint[1] + (toPoint[1] - fromPoint[1]) * t,
    ];
  });

  return samples.some((sample) => {
    if (pointNearAnyPort(sample, [routeStart.name, routeEnd.name])) {
      return false;
    }
    return pointInSolidArea(sample);
  });
};

const buildGrid = (start, end, gridSize = 28) => {
  const minLng = Math.min(start[0], end[0]);
  const maxLng = Math.max(start[0], end[0]);
  const minLat = Math.min(start[1], end[1]);
  const maxLat = Math.max(start[1], end[1]);

  const marginLng = Math.max(6, (maxLng - minLng) * 0.32);
  const marginLat = Math.max(5, (maxLat - minLat) * 0.32);

  const lngStart = minLng - marginLng;
  const lngEnd = maxLng + marginLng;
  const latStart = minLat - marginLat;
  const latEnd = maxLat + marginLat;

  const lngStep = (lngEnd - lngStart) / gridSize;
  const latStep = (latEnd - latStart) / gridSize;

  return { lngStart, lngStep, latStart, latStep, gridSize };
};

const nodePoint = (grid, i, j) => [grid.lngStart + i * grid.lngStep, grid.latStart + j * grid.latStep];

const nearestNode = (grid, point) => {
  const i = Math.round((point[0] - grid.lngStart) / grid.lngStep);
  const j = Math.round((point[1] - grid.latStart) / grid.latStep);
  return [clamp(i, 0, grid.gridSize), clamp(j, 0, grid.gridSize)];
};

const keyOf = ([i, j]) => `${i},${j}`;

const neighborDeltas = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const riskLabel = (riskScore) => {
  if (riskScore < 0.33) return "Low";
  if (riskScore < 0.67) return "Medium";
  return "High";
};

const deriveWeights = (goal, costPreference) => {
  const base = (STRATEGY_PRESETS[goal] || STRATEGY_PRESETS["Balanced Optimization"]).weights;
  const cp = clamp(Number(costPreference ?? 0.5), 0, 1);

  const adjusted = {
    ...base,
    fuel: base.fuel * (1 + cp * 0.55),
    distance: base.distance * (1 - cp * 0.12),
  };

  const total = Object.values(adjusted).reduce((a, b) => a + b, 0);
  return {
    distance: adjusted.distance / total,
    fuel: adjusted.fuel / total,
    weather: adjusted.weather / total,
    traffic: adjusted.traffic / total,
    piracy: adjusted.piracy / total,
  };
};

const edgeMetrics = (fromPoint, toPoint, shipProfile, speedKnots) => {
  const edgeDistanceNm = haversineNm(fromPoint, toPoint);
  const midPoint = [(fromPoint[0] + toPoint[0]) / 2, (fromPoint[1] + toPoint[1]) / 2];

  const trafficRisk = expandedZoneScore(midPoint, TRAFFIC_ZONES, "intensity");
  const piracyRisk = expandedZoneScore(midPoint, PIRACY_ZONES, "intensity");
  const weatherRisk = expandedZoneScore(midPoint, WEATHER_SYSTEMS, "severity");
  const dangerPenalty = expandedZonePenalty(midPoint, DANGER_ZONES, "penalty");

  const speedPenalty = clamp(Math.abs(speedKnots - shipProfile.defaultSpeedKnots) * 0.015, 0, 0.45);
  const fuelMultiplier = getFuelMultiplier(midPoint);

  const fuelTon = edgeDistanceNm * shipProfile.fuelTonPerNm * (1 + speedPenalty);
  const fuelCostUsd = fuelTon * BASE_FUEL_PRICE_PER_TON_USD * fuelMultiplier;

  return {
    edgeDistanceNm,
    fuelTon,
    fuelCostUsd,
    trafficRisk,
    piracyRisk,
    weatherRisk,
    dangerPenalty,
  };
};

const scoreEdge = (metrics, weights) => {
  const normalizedDistance = metrics.edgeDistanceNm / 260;
  const normalizedFuel = metrics.fuelCostUsd / 160000;
  const weatherCost = Math.pow(metrics.weatherRisk, 1.55);
  const trafficCost = Math.pow(metrics.trafficRisk, 1.45);
  const piracyCost = Math.pow(metrics.piracyRisk, 1.5);

  return (
    normalizedDistance * weights.distance +
    normalizedFuel * weights.fuel +
    weatherCost * weights.weather +
    trafficCost * weights.traffic +
    piracyCost * weights.piracy +
    metrics.dangerPenalty / 12000
  );
};

const pathCrossesLand = (coords, routeStart, routeEnd, safetyBias = 1) => {
  for (let i = 0; i < coords.length - 1; i += 1) {
    if (segmentBlocked(coords[i], coords[i + 1], routeStart, routeEnd, safetyBias)) {
      return true;
    }
  }
  return false;
};

const reconstructPath = (cameFrom, currentKey) => {
  const path = [currentKey];
  let cursor = currentKey;
  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor);
    path.push(cursor);
  }
  path.reverse();
  return path;
};

const parseNodeKey = (key) => key.split(",").map((item) => Number(item));

const aStarPath = ({ start, end, weights, shipProfile, speedKnots, gridSize, routeStart, routeEnd }) => {
  const grid = buildGrid(start, end, gridSize);
  const startNode = nearestNode(grid, start);
  const endNode = nearestNode(grid, end);

  const startKey = keyOf(startNode);
  const endKey = keyOf(endNode);

  const openSet = new Set([startKey]);
  const cameFrom = new Map();

  const gScore = new Map([[startKey, 0]]);
  const fScore = new Map([[startKey, haversineNm(start, end) * weights.distance]]);

  while (openSet.size > 0) {
    let currentKey = null;
    let bestF = Number.POSITIVE_INFINITY;

    openSet.forEach((key) => {
      const value = fScore.get(key) ?? Number.POSITIVE_INFINITY;
      if (value < bestF) {
        bestF = value;
        currentKey = key;
      }
    });

    if (!currentKey) break;
    if (currentKey === endKey) {
      const nodePathKeys = reconstructPath(cameFrom, currentKey);
      const nodePathCoords = nodePathKeys.map((nodeKey) => {
        const [i, j] = parseNodeKey(nodeKey);
        return nodePoint(grid, i, j);
      });
      nodePathCoords[0] = start;
      nodePathCoords[nodePathCoords.length - 1] = end;
      return nodePathCoords;
    }

    openSet.delete(currentKey);
    const [ci, cj] = parseNodeKey(currentKey);
    const currentPoint = nodePoint(grid, ci, cj);

    for (const [di, dj] of neighborDeltas) {
      const ni = ci + di;
      const nj = cj + dj;
      if (ni < 0 || nj < 0 || ni > grid.gridSize || nj > grid.gridSize) continue;

      const neighborKey = keyOf([ni, nj]);
      const neighborPoint = nodePoint(grid, ni, nj);

      if (pointInSolidArea(neighborPoint) && !pointNearAnyPort(neighborPoint, [routeStart.name, routeEnd.name], PORT_BUFFER_NM)) {
        continue;
      }

      const safetyBias = (STRATEGY_PRESETS[weights.__strategyName] || STRATEGY_PRESETS["Balanced Optimization"]).safetyBias;
      if (segmentBlocked(currentPoint, neighborPoint, routeStart, routeEnd, safetyBias)) {
        continue;
      }

      const metrics = edgeMetrics(currentPoint, neighborPoint, shipProfile, speedKnots);
      const travelCost = scoreEdge(metrics, weights);
      const tentativeG = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + travelCost;

      if (tentativeG < (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        const heuristic = haversineNm(neighborPoint, end) * weights.distance;
        fScore.set(neighborKey, tentativeG + heuristic);
        openSet.add(neighborKey);
      }
    }
  }

  return [start, end];
};

const strategyRouteNames = (goal) => {
  const ordered = [goal, ...ROUTE_TYPES, "Balanced Optimization"];
  return [...new Set(ordered)].filter((name) => ROUTE_TYPES.includes(name));
};

const buildOffsetAnchor = (start, end, fraction, offsetNm, side) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lineLength = Math.hypot(dx, dy) || 1;
  const ux = dx / lineLength;
  const uy = dy / lineLength;
  const px = -uy;
  const py = ux;

  const baseLng = start[0] + dx * fraction;
  const baseLat = start[1] + dy * fraction;
  const offsetLat = py * (offsetNm / 60) * side;
  const cosLat = Math.max(Math.cos((baseLat * Math.PI) / 180), 0.25);
  const offsetLng = (px * (offsetNm / 60) * side) / cosLat;

  return [baseLng + offsetLng, baseLat + offsetLat];
};

const buildControlPoints = (start, end, strategyName, request, offsetScale = 1, sideOverride = 0) => {
  const distanceNm = haversineNm(start, end);
  const directionEastward = end[0] >= start[0];
  const southSide = directionEastward ? -1 : 1;
  const northSide = -southSide;
  const side = sideOverride === 0 ? southSide : sideOverride;

  if (request.startPort.includes("India") && request.destinationPort === "Singapore") {
    if (strategyName === "Fastest Route") {
      return [
        buildOffsetAnchor(start, end, 0.28, 40 * offsetScale, side),
        buildOffsetAnchor(start, end, 0.63, 26 * offsetScale, side),
      ];
    }

    if (strategyName === "Most Fuel Efficient") {
      return [
        buildOffsetAnchor(start, end, 0.24, 58 * offsetScale, side),
        buildOffsetAnchor(start, end, 0.56, 42 * offsetScale, side),
        buildOffsetAnchor(start, end, 0.84, 30 * offsetScale, side),
      ];
    }

    if (strategyName === "Lowest Cost") {
      return [
        buildOffsetAnchor(start, end, 0.25, 54 * offsetScale, side),
        buildOffsetAnchor(start, end, 0.68, 38 * offsetScale, side),
      ];
    }

    if (strategyName === "Balanced Optimization") {
      return [
        buildOffsetAnchor(start, end, 0.3, 32 * offsetScale, side),
        buildOffsetAnchor(start, end, 0.66, 26 * offsetScale, side),
      ];
    }
  }

  const strategyOffset = (STRATEGY_PRESETS[strategyName] || STRATEGY_PRESETS["Balanced Optimization"]).offsetNm;
  const baseOffset = strategyOffset * offsetScale;
  const biasSide = sideOverride === 0 ? southSide : sideOverride;
  const anchors = [buildOffsetAnchor(start, end, 0.45, baseOffset, biasSide)];

  if (distanceNm > 1400) {
    anchors.push(buildOffsetAnchor(start, end, 0.72, baseOffset * 0.75, biasSide));
  }

  return anchors;
};

const legPlan = (start, end, strategyName, request, offsetScale, sideOverride) => {
  const anchors = buildControlPoints(start, end, strategyName, request, offsetScale, sideOverride);
  return [start, ...anchors, end];
};

const planRouteThroughLegs = ({ start, end, strategyName, request, weights, shipProfile, speedKnots, offsetScale = 1, sideOverride = 0 }) => {
  const controlPoints = legPlan(start, end, strategyName, request, offsetScale, sideOverride);
  const combined = [controlPoints[0]];

  for (let i = 0; i < controlPoints.length - 1; i += 1) {
    const legStart = controlPoints[i];
    const legEnd = controlPoints[i + 1];
    const legCoords = aStarPath({
      start: legStart,
      end: legEnd,
      weights,
      shipProfile,
      speedKnots,
      gridSize: 24 + i * 2,
      routeStart: { name: request.startPort },
      routeEnd: { name: request.destinationPort },
    });

    if (i > 0) {
      legCoords.shift();
    }
    combined.push(...legCoords);
  }

  return combined;
};

const summarizePath = ({ coords, start, end, shipProfile, speedKnots, weights }) => {
  let distanceNm = 0;
  let fuelTon = 0;
  let fuelCostUsd = 0;
  let weather = 0;
  let traffic = 0;
  let piracy = 0;

  for (let i = 0; i < coords.length - 1; i += 1) {
    const metrics = edgeMetrics(coords[i], coords[i + 1], shipProfile, speedKnots);
    distanceNm += metrics.edgeDistanceNm;
    fuelTon += metrics.fuelTon;
    fuelCostUsd += metrics.fuelCostUsd;
    weather += metrics.weatherRisk;
    traffic += metrics.trafficRisk;
    piracy += metrics.piracyRisk;
  }

  const segmentCount = Math.max(1, coords.length - 1);
  const weatherAvg = weather / segmentCount;
  const trafficAvg = traffic / segmentCount;
  const piracyAvg = piracy / segmentCount;

  const routeHours = distanceNm / Math.max(speedKnots, 1);
  const routeCostInr = Math.round(fuelCostUsd * 83);

  const baselineDistanceNm = haversineNm(start, end);
  const baselineFuelTon = baselineDistanceNm * shipProfile.fuelTonPerNm;
  const baselineCostInr = Math.round(baselineFuelTon * BASE_FUEL_PRICE_PER_TON_USD * 83);

  const score =
    (distanceNm / 2500) * weights.distance +
    (routeCostInr / 3000000) * weights.fuel +
    weatherAvg * weights.weather +
    trafficAvg * weights.traffic +
    piracyAvg * weights.piracy;

  const riskValue = (weatherAvg + trafficAvg + piracyAvg) / 3;

  return {
    distance: round(distanceNm, 1),
    fuel: round(fuelTon, 1),
    cost: routeCostInr,
    eta: formatEta(routeHours),
    travelHours: round(routeHours, 1),
    score: round(score, 4),
    weatherAvg: round(weatherAvg, 3),
    trafficAvg: round(trafficAvg, 3),
    piracyAvg: round(piracyAvg, 3),
    risk: riskLabel(riskValue),
    fuelEfficiency: round(clamp(100 - fuelTon / 25, 55, 98), 0),
    carbonEmissions: round(fuelTon * 3.12, 0),
    baselineDistanceNm: round(baselineDistanceNm, 1),
    baselineCostInr,
    savingsInr: Math.max(0, baselineCostInr - routeCostInr),
    fuelSavedTon: round(Math.max(0, baselineFuelTon - fuelTon), 1),
  };
};

export const optimizeRouteSet = (request) => {
  const startCoordRaw = PORT_COORDINATES[request.startPort];
  const endCoordRaw = PORT_COORDINATES[request.destinationPort];

  if (!startCoordRaw || !endCoordRaw) {
    throw new Error("Unsupported port name. Use one of the known port labels.");
  }

  const shipProfile = SHIP_PROFILES[request.shipType] || DEFAULT_SHIP_PROFILE;
  const requestedSpeed = clamp(Number(request.speedKnots || shipProfile.defaultSpeedKnots), 8, 30);

  const start = [startCoordRaw.lng, startCoordRaw.lat];
  const end = [endCoordRaw.lng, endCoordRaw.lat];
  const variants = strategyRouteNames(request.optimizationGoal);

  return variants.map((strategyName, index) => {
    const profile = STRATEGY_PRESETS[strategyName] || STRATEGY_PRESETS["Balanced Optimization"];
    const effectiveSpeedKnots = clamp(requestedSpeed * profile.speedFactor, 8, 30);
    const weights = {
      ...deriveWeights(strategyName, request.costPreference),
      __strategyName: strategyName,
    };

    const strategyShipProfile = {
      ...shipProfile,
      fuelTonPerNm: shipProfile.fuelTonPerNm * profile.fuelBurnFactor,
    };

    const attemptPlans = [
      { offsetScale: 1, sideOverride: 0 },
      { offsetScale: 1.3, sideOverride: 0 },
      { offsetScale: 1.6, sideOverride: -1 },
      { offsetScale: 1.85, sideOverride: 1 },
    ];

    let smoothed = [];
    for (const attempt of attemptPlans) {
      const rawPath = planRouteThroughLegs({
        start,
        end,
        strategyName,
        request,
        weights,
        shipProfile: strategyShipProfile,
        speedKnots: effectiveSpeedKnots,
        offsetScale: attempt.offsetScale,
        sideOverride: attempt.sideOverride,
      });

      const candidate = smoothRouteCoordinates(rawPath, 3 + index);
      if (!pathCrossesLand(candidate, { name: request.startPort }, { name: request.destinationPort }, profile.safetyBias)) {
        smoothed = candidate;
        break;
      }
      smoothed = candidate;
    }

    const summary = summarizePath({
      coords: smoothed,
      start,
      end,
      shipProfile: strategyShipProfile,
      speedKnots: effectiveSpeedKnots,
      weights,
    });

    const adjustedCost = Math.round(summary.cost * profile.costFactor);
    const adjustedSavings = Math.max(0, summary.baselineCostInr - adjustedCost);

    return {
      id: `${strategyName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${index + 1}`,
      name: strategyName,
      distance: summary.distance,
      eta: summary.eta,
      fuel: summary.fuel,
      cost: adjustedCost,
      risk: summary.risk,
      coords: smoothed,
      waypoints: coordsToWaypoints(smoothed),
      weather: `Composite weather risk index ${summary.weatherAvg}`,
      piracyRisk: `Composite piracy risk index ${summary.piracyAvg}`,
      fuelEfficiency: summary.fuelEfficiency,
      carbonEmissions: summary.carbonEmissions,
      score: summary.score,
      travelHours: summary.travelHours,
      routeSavingsInr: adjustedSavings,
      routeFuelSavedTon: summary.fuelSavedTon,
      baselineDistanceNm: summary.baselineDistanceNm,
      baselineCostInr: summary.baselineCostInr,
      scoringBreakdown: {
        distanceWeight: round(deriveWeights(strategyName, request.costPreference).distance, 3),
        fuelWeight: round(deriveWeights(strategyName, request.costPreference).fuel, 3),
        weatherWeight: round(deriveWeights(strategyName, request.costPreference).weather, 3),
        trafficWeight: round(deriveWeights(strategyName, request.costPreference).traffic, 3),
        piracyWeight: round(deriveWeights(strategyName, request.costPreference).piracy, 3),
        trafficIndex: summary.trafficAvg,
        weatherIndex: summary.weatherAvg,
        piracyIndex: summary.piracyAvg,
        effectiveSpeedKnots: round(effectiveSpeedKnots, 1),
      },
    };
  }).sort((a, b) => ROUTE_TYPES.indexOf(a.name) - ROUTE_TYPES.indexOf(b.name));
};
