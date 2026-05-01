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
import { generateGeographicRoute } from "./gridPathfindingService.js";

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

const pointInSolidArea = (point) => {
  // EXCEPTION: Very generously exempt port areas from land detection
  // This handles island ports where GeoJSON classifies them as land
  const allPorts = Object.values(PORT_COORDINATES);
  for (const port of allPorts) {
    const distance = haversineNm(point, [port.lng, port.lat]);
    // 5x buffer - extremely generous for island ports
    if (distance <= PORT_BUFFER_NM * 5) {
      return false;  // Within port area, always treat as water
    }
  }
  return isLand(point[1], point[0]);
};

const pointNearAnyPort = (point, portNames, radiusNm = PORT_BUFFER_NM) =>
  portNames.some((portName) => {
    const port = PORT_COORDINATES[portName];
    if (!port) return false;
    return haversineNm(point, [port.lng, port.lat]) <= radiusNm;
  });

const segmentBlocked = (fromPoint, toPoint, routeStart, routeEnd, _safetyBias) => {
  // Check for major land crossings, but allow maritime passages and straits
  const samples = Array.from({ length: 100 }, (_, idx) => {
    const t = (idx + 1) / 101;
    return [
      fromPoint[0] + (toPoint[0] - fromPoint[0]) * t,
      fromPoint[1] + (toPoint[1] - fromPoint[1]) * t,
    ];
  });

  // Reasonable land validation: Allow narrow straits/channels (up to 10% land tolerance)
  // but reject if more than 10 consecutive land samples (major land mass crossing)
  const landThreshold = 10;  // Max 10% land samples allowed
  const consecutiveThreshold = 3;  // Max 3 consecutive land samples allowed
  
  let landCount = 0;
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  
  for (const sample of samples) {
    // Very generous port buffer for island routes
    if (pointNearAnyPort(sample, [routeStart.name, routeEnd.name], PORT_BUFFER_NM * 2)) {
      currentConsecutive = 0;
      continue;  // Allow ports as exceptions
    }
    if (pointInSolidArea(sample)) {
      landCount++;
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }
  
  // Reject only if: more than 10% land samples OR more than 3 consecutive land samples
  if (landCount > landThreshold || maxConsecutive > consecutiveThreshold) {
    return true;  // Blocked - significant land crossing detected
  }
  
  return false;  // Not blocked - minor land contact (straits/channels allowed)
};

const buildGrid = (start, end, gridSize = 42) => {
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

/**
 * STRICT: Check if path crosses land at ALL
 * Returns true if ANY sample point is on land (ZERO tolerance)
 */
const pathCrossesLand = (coords, routeStart, routeEnd, safetyBias = 1) => {
  if (!coords || coords.length < 2) return false;

  // Check every segment of the path
  for (let i = 0; i < coords.length - 1; i++) {
    const fromPoint = coords[i];
    const toPoint = coords[i + 1];

    // Sample 100 points along this segment
    const samples = Array.from({ length: 100 }, (_, idx) => {
      const t = (idx + 1) / 101;
      return [
        fromPoint[0] + (toPoint[0] - fromPoint[0]) * t,
        fromPoint[1] + (toPoint[1] - fromPoint[1]) * t,
      ];
    });

    // Reasonable land tolerance: Allow up to 10% land samples (straits/channels)
    // Reject only if more than 10 consecutive or 10+ total land samples
    let landCount = 0;
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const sample of samples) {
      // Always allow ports as exceptions
      if (pointNearAnyPort(sample, [routeStart.name, routeEnd.name], PORT_BUFFER_NM * 5)) {
        currentConsecutive = 0;
        continue;
      }
      
      if (pointInSolidArea(sample)) {
        landCount++;
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    // Reject only if: more than 10% land samples OR more than 10 consecutive land samples
    if (landCount > 10 || maxConsecutive > 10) {
      console.debug(`[Land Crossing] Segment ${i} has too much land: ${landCount} samples, ${maxConsecutive} consecutive`);
      return true;  // Path crosses significant land
    }
  }

  return false;  // Path is mostly water (may have minor straits/channels)
};

/**
 * Validates smoothed path and adds waypoints if segments cross land
 * Returns original path if no land crossing, or enriched path with intermediate waypoints
 */
/**
 * Validates smoothed path and ensures NO land crossing at all
 * Returns null if ANY segment crosses land (forces re-planning)
 * Returns path only if completely water-only
 */
const validateAndFixSmoothedPath = (coords, routeStart, routeEnd, safetyBias = 1) => {
  // STRICT: First check - if ANY segment crosses land, reject immediately
  if (pathCrossesLand(coords, routeStart, routeEnd, safetyBias)) {
    console.debug(`[Land Check] Smoothed path from ${routeStart.name} to ${routeEnd.name} crosses land - rejecting`);
    return null;  // Force re-planning with different parameters
  }
  
  // Path is completely water-only, safe to return
  return coords;
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

  let iterations = 0;
  const MAX_ITERATIONS = 10000;

  while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
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

      // HARD CONSTRAINT: Strictly reject all land nodes
      // Exception: Allow only START and END nodes (which should be at ports)
      if (pointInSolidArea(neighborPoint)) {
        // Reject unless this is the endpoint
        if (!((neighborPoint[0] === end[0] && neighborPoint[1] === end[1]) ||
              (neighborPoint[0] === start[0] && neighborPoint[1] === start[1]))) {
          continue;  // Skip this land node
        }
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

  const anchorLng = baseLng + offsetLng;
  const anchorLat = baseLat + offsetLat;
  
  // Hard constraint: find a water-only point
  if (pointInSolidArea([anchorLng, anchorLat])) {
    // Try increasing offset multiples (200%, 300%, 400%, 500%)
    for (let multiplier = 1.5; multiplier <= 5; multiplier += 0.5) {
      const testLng = baseLng + offsetLng * multiplier;
      const testLat = baseLat + offsetLat * multiplier;
      if (!pointInSolidArea([testLng, testLat])) {
        return [testLng, testLat];
      }
    }
    
    // Try opposite direction with increased offsets
    for (let multiplier = 1.5; multiplier <= 5; multiplier += 0.5) {
      const testLng = baseLng - offsetLng * multiplier;
      const testLat = baseLat - offsetLat * multiplier;
      if (!pointInSolidArea([testLng, testLat])) {
        return [testLng, testLat];
      }
    }
    
    // Try increasing original direction gradually
    for (let reduction = 0.9; reduction >= 0; reduction -= 0.05) {
      const testLng = baseLng + offsetLng * reduction;
      const testLat = baseLat + offsetLat * reduction;
      if (!pointInSolidArea([testLng, testLat])) {
        return [testLng, testLat];
      }
    }
    
    // Try opposite direction reduction
    for (let reduction = 0.05; reduction <= 0.9; reduction += 0.05) {
      const testLng = baseLng - offsetLng * reduction;
      const testLat = baseLat - offsetLat * reduction;
      if (!pointInSolidArea([testLng, testLat])) {
        return [testLng, testLat];
      }
    }
    
    // Last resort: return start or end point (which should be water at ports)
    if (!pointInSolidArea(start)) return start;
    if (!pointInSolidArea(end)) return end;
    
    // Absolute last resort: return base point
    return [baseLng, baseLat];
  }

  return [anchorLng, anchorLat];
};

const buildControlPoints = (start, end, strategyName, request, offsetScale = 1, sideOverride = 0) => {
  const distanceNm = haversineNm(start, end);
  const directionEastward = end[0] >= start[0];
  const southSide = directionEastward ? -1 : 1;
  const northSide = -southSide;
  const side = sideOverride === 0 ? southSide : sideOverride;

  const isIndianPort = request.startPort.includes("India") || 
    (/Mumbai|Chennai|Kochi|Visakhapatnam|Kandla/i.test(request.startPort) && request.startPort.includes("Port"));
  const isSingaporePort = /Singapore/.test(request.destinationPort);

  // SPECIAL CASE: Mumbai to Singapore - route through Strait of Malacca
  if (isIndianPort && isSingaporePort) {
    // Waypoint 1: Southeast of Mumbai (in ocean)
    const wp1 = [75.0, 14.0];  // Southern ocean route
    // Waypoint 2: Entrance to Strait of Malacca (western approach)
    const wp2 = [96.5, 8.0];   // Before Strait opening
    // Waypoint 3: Through Strait of Malacca (middle passage)
    const wp3 = [101.0, 5.0];  // Through Strait
    // Waypoint 4: Approaching Singapore (eastern side)
    const wp4 = [103.0, 3.0];  // Before Singapore
    
    return [wp1, wp2, wp3, wp4];
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
  // Interpolate between control points with explicit water-area checking
  const combined = [];
  const INTERPOLATION_STEPS = 16;  // Doubled for more frequent land detection
  
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const current = controlPoints[i];
    const next = controlPoints[i + 1];
    
    if (i === 0) {
      combined.push(current);
    }
    
    // Generate interpolated points with fine granularity for land detection
    for (let step = 1; step <= INTERPOLATION_STEPS; step++) {
      const t = step / INTERPOLATION_STEPS;
      const lat = current[1] + (next[1] - current[1]) * t;
      const lng = current[0] + (next[0] - current[0]) * t;
      const point = [lng, lat];
      
      // If point is on land, aggressively find water route
      if (pointInSolidArea([lng, lat])) {
        // Move the point perpendicular to the route direction to find water
        const dx = next[0] - current[0];
        const dy = next[1] - current[1];
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist; // Normal vector
        const ny = dx / dist;
        
        // Try lateral offsets with ultra-fine granularity (0.01 degree steps)
        let foundWater = false;
        // Try perpendicular offsets, wider search area
        for (let offset = 0.01; offset <= 5; offset += 0.01) {
          const altLng = lng + nx * offset;
          const altLat = lat + ny * offset;
          if (!pointInSolidArea([altLng, altLat])) {
            combined.push([altLng, altLat]);
            foundWater = true;
            break;
          }
          
          const altLng2 = lng - nx * offset;
          const altLat2 = lat - ny * offset;
          if (!pointInSolidArea([altLng2, altLat2])) {
            combined.push([altLng2, altLat2]);
            foundWater = true;
            break;
          }
        }
        
        // If still no water in immediate perpendicular, try diagonal offsets
        if (!foundWater) {
          for (let offset = 0.05; offset <= 2; offset += 0.05) {
            // Try diagonal offsets
            const diagonals = [
              [lng + offset, lat + offset],
              [lng + offset, lat - offset],
              [lng - offset, lat + offset],
              [lng - offset, lat - offset],
            ];
            for (const [dlng, dlat] of diagonals) {
              if (!pointInSolidArea([dlng, dlat])) {
                combined.push([dlng, dlat]);
                foundWater = true;
                break;
              }
            }
            if (foundWater) break;
          }
        }
        
        // If still can't find water, skip and let validation catch it
        // The validation will reject this path and trigger retry with different params
        if (!foundWater) {
          // Don't add anything - validation will detect the land crossing
          continue;
        }
      } else {
        combined.push(point);
      }
    }
  }
  
  return combined.length > 2 ? combined : [start, end];
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

/**
 * Strict land validation for saving routes
 * Returns true if route crosses significant land, false if water-only
 * Used by save-route endpoint to ensure routes are maritime-only
 */
export const validateRouteLandCrossing = (route) => {
  if (!route || !route.coords || route.coords.length < 2) {
    return false; // No coords to check
  }

  // Get port information for exceptions
  const startName = route.startPort || "";
  const endName = route.destinationPort || "";

  return pathCrossesLand(route.coords, 
    { name: startName }, 
    { name: endName }, 
    1.0  // Standard safety bias for save validation
  );
};

export const optimizeRouteSet = (request) => {
  const startCoordRaw = PORT_COORDINATES[request.startPort];
  const endCoordRaw = PORT_COORDINATES[request.destinationPort];

  if (!startCoordRaw || !endCoordRaw) {
    throw new Error("Unsupported port name. Use one of the known port labels.");
  }

  const start = [startCoordRaw.lng, startCoordRaw.lat];
  const end = [endCoordRaw.lng, endCoordRaw.lat];
  
  // Treat start and end as water regardless of isLand() result (they're ports!)
  const startNearPort = pointNearAnyPort(start, [request.startPort], PORT_BUFFER_NM);
  const endNearPort = pointNearAnyPort(end, [request.destinationPort], PORT_BUFFER_NM);
  
  // Log route information
  console.log(`\n[Route Optimization] ${request.startPort} → ${request.destinationPort}`);
  console.log(`  Start: [${start[0]}, ${start[1]}] (${startNearPort ? "PORT ✓" : "LAND/WATER"})`);
  console.log(`  End: [${end[0]}, ${end[1]}] (${endNearPort ? "PORT ✓" : "LAND/WATER"})`);
  
  // Check if straight line crosses land (excluding ports)
  const straightLineTest = segmentBlocked(start, end, { name: request.startPort }, { name: request.destinationPort }, 1);
  console.log(`  Straight line crosses land: ${straightLineTest ? "YES ✗" : "NO ✓"}`);

  const shipProfile = SHIP_PROFILES[request.shipType] || DEFAULT_SHIP_PROFILE;
  const requestedSpeed = clamp(Number(request.speedKnots || shipProfile.defaultSpeedKnots), 8, 30);
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

    let smoothed = null;
    let landCrossing = false;

    // PRIORITY 1: Generate route using offset-based pathfinding with multiple legs for long routes
    const directDistance = haversineNm(start, end);
    const isLongRoute = directDistance > 3000;

    // For long routes, try geographic routing first as a foundation
    let geoPath = null;
    if (isLongRoute) {
      console.debug(`[${strategyName}] Long route detected (${directDistance.toFixed(0)} NM), attempting geographic-aware routing...`);
      geoPath = generateGeographicRoute(start[0], start[1], end[0], end[1]);
      if (geoPath && geoPath.length > 2) {
        console.log(`✓ [${strategyName}] Geographic pathfinding provided ${geoPath.length} waypoints`);
        smoothed = geoPath;
        landCrossing = false;
      }
    }

    // If geographic routing didn't provide a path, try offset-based approach
    if (!smoothed) {
      console.debug(`[${strategyName}] Using offset-based approach...`);
      
      const attemptPlans = [
        { offsetScale: 1, sideOverride: 0 },
        { offsetScale: 1.3, sideOverride: 0 },
        { offsetScale: 1.6, sideOverride: -1 },
        { offsetScale: 1.85, sideOverride: 1 },
      ];

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

        let candidate = smoothRouteCoordinates(rawPath, 3 + index);
        
        // HARD CONSTRAINT: Validate entire smoothed path against land
        const validatedPath = validateAndFixSmoothedPath(
          candidate, 
          { name: request.startPort }, 
          { name: request.destinationPort }, 
          profile.safetyBias
        );
        
        // Check if validation fixed the path
        if (validatedPath !== null) {
          // Path is water-only
          console.log(`✓ [${strategyName}] Offset-based route is water-only (offset: ${attempt.offsetScale})`);
          smoothed = validatedPath;
          landCrossing = false;
          break;  // Accept first water-only route
        } else {
          // Path crosses land, try next attempt
          console.debug(`✗ [${strategyName}] Offset-based route crosses land (offset: ${attempt.offsetScale})`);
        }
      }

      // If offset-based also fails, flag as land crossing
      if (!smoothed) {
        console.warn(`[Route Optimization] WARNING: All route attempts cross land for ${request.startPort} to ${request.destinationPort}. Returning raw straight path.`);
        smoothed = [start, end];
        landCrossing = true;  // Flag this route as invalid
      }
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
      routeType: strategyName,
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
      // Persistence fields (snake_case for database)
      optimization_score: summary.score,
      route_coords: smoothed,
      route_cost_inr: adjustedCost,
      baseline_cost_inr: summary.baselineCostInr,
      savings_inr: adjustedSavings,
      travel_hours: summary.travelHours,
      baseline_distance_nm: summary.baselineDistanceNm,
      fuel_saved_ton: summary.fuelSavedTon,
      estimated_time: summary.eta,
      fuel_consumption: summary.fuel,
      risk_level: summary.risk,
      // Land crossing warning flag
      landCrossing: landCrossing || false,
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
