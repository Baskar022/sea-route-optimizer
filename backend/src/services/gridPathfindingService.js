import { haversineNm, isLand } from "../utils/geo.js";
import { PORT_BUFFER_NM, DANGER_ZONES, PIRACY_ZONES } from "../data/maritimeRiskData.js";
import { PORT_COORDINATES } from "../data/ports.js";

/**
 * Geographic-aware maritime route generation
 * Creates realistic curved routes by understanding major maritime passages and geography
 */

// Major maritime passages and strategic waypoints for common routes
const MARITIME_PASSAGES = [
  {
    name: "Strait of Malacca",
    west: [95.0, 8.0],
    center: [100.5, 4.5],
    east: [105.0, 1.0],
    regions: ["SE Asia", "Middle East"]
  },
  {
    name: "Suez Canal",
    north: [32.3, 31.5],
    center: [32.3, 29.5],
    south: [32.3, 27.5],
    regions: ["Africa", "Europe", "Middle East"]
  },
  {
    name: "Panama Canal",
    north: [-79.5, 9.2],
    center: [-79.5, 8.95],
    south: [-79.5, 8.5],
    regions: ["Americas", "Pacific"]
  },
  {
    name: "Singapore Strait",
    west: [103.0, 1.5],
    center: [103.85, 1.29],
    east: [104.5, 1.0],
    regions: ["SE Asia"]
  },
];

/**
 * Find major passages that should be used between start and end
 */
const findRelevantPassages = (startLng, startLat, endLng, endLat) => {
  const relevant = [];
  
  // Suez Canal: Europe/Mediterranean to Asia routes
  // Start should be in Mediterranean/Red Sea region or Europe
  // End should be in Asia (positive longitude)
  if (startLng > -30 && startLng < 50 && startLat > 20 &&
      endLng > 40 && endLat < 35) {
    // This could be Europe to Red Sea/Indian Ocean
    const suez = MARITIME_PASSAGES.find(p => p.name === "Suez Canal");
    if (suez && relevant.length === 0) {
      relevant.push(suez);
    }
  }

  // Panama Canal: Americas to Asia/Pacific routes
  // Start should be in Americas, End in Asia/Pacific
  if (startLng < -60 && Math.abs(startLat) < 45 &&
      endLng > 100 && Math.abs(endLat) < 45) {
    // For LA to Singapore specifically, just use offset-based since it's a straightforward Pacific route
    // Only use Panama if going to very far Pacific destinations
    if (endLng > 140 || (endLat < -20)) {
      const panama = MARITIME_PASSAGES.find(p => p.name === "Panama Canal");
      if (panama && relevant.length === 0) {
        relevant.push(panama);
      }
    }
  }

  // Strait of Malacca: Indian Ocean/Western routes to SE Asia
  if (startLng > 30 && startLng < 100 && startLat > -10 && startLat < 30 &&
      endLng > 95 && endLng < 110 && endLat > -15 && endLat < 10) {
    const malacca = MARITIME_PASSAGES.find(p => p.name === "Strait of Malacca");
    if (malacca && relevant.length === 0) {
      relevant.push(malacca);
    }
  }

  return relevant;
};

const getRegion = (lat, lng) => {
  if (lat > 40 && lng < -50) return "North America";
  if (lat > 0 && lng < -80) return "Americas";
  if (lat < -20 && lng < -40) return "South America";
  if (lat > 50 && lng > -10 && lng < 50) return "Europe";
  if (lat > 20 && lng > -20 && lng < 60) return "Africa";
  if (lat > 0 && lng > 50 && lng < 100) return "India Middle East";
  if (lat > 0 && lng > 90 && lng < 150) return "SE Asia East Asia";
  if (lat > 20 && lng > 100 && lng < 180) return "East Asia";
  if (lat < 0 && lng > 110) return "Australia Pacific";
  return "Ocean";
};

/**
 * Generate waypoints that curve around continents using geographic knowledge
 * Works for ALL routes by generating curved via-points
 */
export const generateGeographicRoute = (startLng, startLat, endLng, endLat) => {
  try {
    const directDistance = haversineNm([startLng, startLat], [endLng, endLat]);
    
    // Generate waypoints for ALL routes to create curved maritime paths
    const waypoints = [[startLng, startLat]];
    
    // For very short routes (< 200 NM), just use direct line
    if (directDistance < 200) {
      console.debug(`[Geographic Route] Route too short (${directDistance.toFixed(0)} NM), using direct line`);
      return null;
    }

    // Check for major passages that should be used
    const passages = findRelevantPassages(startLng, startLat, endLng, endLat);

    // If using major passages, add their waypoints
    if (passages.length > 0) {
      for (const passage of passages) {
        if (passage.west) waypoints.push(passage.west);
        if (passage.center) waypoints.push(passage.center);
        if (passage.east) waypoints.push(passage.east);
      }
    } else {
      // No major passages - generate intermediate waypoints to curve around land
      const intermediates = generateCurvedWaypoints(startLng, startLat, endLng, endLat);
      for (const wp of intermediates) {
        waypoints.push(wp);
      }
    }

    waypoints.push([endLng, endLat]);

    // Filter waypoints - remove any on land
    const waterWaypoints = waypoints.filter(wp => {
      // Always keep start and end (they're ports)
      if ((wp[0] === startLng && wp[1] === startLat) || 
          (wp[0] === endLng && wp[1] === endLat)) {
        return true;
      }
      
      // Check if near any port
      for (const port of Object.values(PORT_COORDINATES)) {
        if (haversineNm(wp, [port.lng, port.lat]) <= PORT_BUFFER_NM * 3) {
          return true; // Port is water
        }
      }
      return !isLand(wp[1], wp[0]);
    });

    console.debug(`[Geographic Route] Generated ${waterWaypoints.length} waypoints for ${directDistance.toFixed(0)} NM route`);
    return waterWaypoints.length > 2 ? waterWaypoints : null;
  } catch (error) {
    console.error(`[Geographic Route] Error: ${error.message}`);
    return null;
  }
};

/**
 * Generate intermediate waypoints that curve around continents
 * Uses equidistant points offset perpendicular to straight line
 */
const generateCurvedWaypoints = (startLng, startLat, endLng, endLat) => {
  const waypoints = [];
  const distance = haversineNm([startLng, startLat], [endLng, endLat]);
  
  // Only generate intermediate waypoints for long routes
  if (distance < 500) return waypoints;

  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const lineLength = Math.hypot(dx, dy) || 1;
  
  // Perpendicular vector
  const px = -dy / lineLength;
  const py = dx / lineLength;

  // Generate waypoints at 1/4 and 3/4 of the route
  const fractions = distance > 3000 ? [0.25, 0.5, 0.75] : [0.35, 0.65];
  
  for (const frac of fractions) {
    const baseLng = startLng + dx * frac;
    const baseLat = startLat + dy * frac;
    
    // Offset perpendicular to the route (curve around land)
    const offsetDeg = Math.min(15, distance * 0.002); // Scale with distance
    const cosLat = Math.cos((baseLat * Math.PI) / 180);
    const offsetLng = (px * offsetDeg) / cosLat;
    const offsetLat = py * offsetDeg;

    const wp = [baseLng + offsetLng, baseLat + offsetLat];
    
    // Find water-only point near this target
    const waterWp = findNearbyWaterPoint(wp[0], wp[1]);
    if (waterWp) {
      waypoints.push(waterWp);
    }
  }

  return waypoints;
};

/**
 * Find a nearby water point from a target coordinate
 */
const findNearbyWaterPoint = (lng, lat) => {
  if (!isLand(lat, lng)) {
    return [lng, lat]; // Already water
  }

  // Search in expanding radius for water
  for (let offset = 0.1; offset <= 3; offset += 0.1) {
    const candidates = [
      [lng + offset, lat],
      [lng - offset, lat],
      [lng, lat + offset],
      [lng, lat - offset],
      [lng + offset, lat + offset],
      [lng + offset, lat - offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset],
    ];

    for (const candidate of candidates) {
      if (!isLand(candidate[1], candidate[0])) {
        return candidate;
      }
    }
  }

  return null; // Couldn't find nearby water
};

