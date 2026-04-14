import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { readFileSync } from "node:fs";
import { point } from "@turf/helpers";
const landGeoJSON = JSON.parse(readFileSync(new URL("../data/land_geojson.json", import.meta.url), "utf-8"));
const landPolygons = Array.isArray(landGeoJSON.features)
  ? landGeoJSON.features
  : (landGeoJSON.geometries || []).map((geometry) => ({ type: "Feature", geometry, properties: {} }));

const collectCoordinates = (value, acc = []) => {
  if (!Array.isArray(value)) return acc;
  if (value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    acc.push(value);
    return acc;
  }
  value.forEach((item) => collectCoordinates(item, acc));
  return acc;
};

const polygonWithBounds = landPolygons.map((feature) => {
  const coordinates = collectCoordinates(feature?.geometry?.coordinates || []);
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  coordinates.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  });

  return {
    feature,
    bounds: { minLng, minLat, maxLng, maxLat },
  };
});
const EARTH_RADIUS_KM = 6371;
const KM_TO_NM = 0.539957;

const toRad = (deg) => (deg * Math.PI) / 180;

export const isLand = (lat, lng) => {
  const pt = point([lng, lat]);

  return polygonWithBounds.some(({ feature, bounds }) => {
    if (lng < bounds.minLng || lng > bounds.maxLng || lat < bounds.minLat || lat > bounds.maxLat) {
      return false;
    }

    return booleanPointInPolygon(pt, feature);
  });
};

export const haversineNm = ([lng1, lat1], [lng2, lat2]) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c * KM_TO_NM;
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const distanceToZoneFactor = (point, zoneCenter, radiusNm) => {
  const distance = haversineNm(point, zoneCenter);
  if (distance >= radiusNm) return 0;
  return 1 - distance / radiusNm;
};

export const formatEta = (hours) => {
  const safeHours = Math.max(0, hours);
  const wholeHours = Math.floor(safeHours);
  const minutes = Math.round((safeHours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};
