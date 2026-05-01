import { Router } from "express";
import { optimizeRouteSet } from "../services/routeOptimizerService.js";
import { persistOptimizedRoutes } from "../services/supabaseRouteRepository.js";
import { DANGER_ZONES, PIRACY_ZONES, TRAFFIC_ZONES, WEATHER_SYSTEMS } from "../data/maritimeRiskData.js";
import { PORTS_BY_COUNTRY } from "../data/ports.js";

const router = Router();

const requiredFields = [
  "startPort",
  "destinationPort",
  "departureTime",
  "shipType",
  "optimizationGoal",
];

const buildOptimizerMeta = () => ({
  algorithm: "astar-haversine-weighted",
  format: "coords => [[lng, lat], ...]",
  portsByCountry: PORTS_BY_COUNTRY,
  constraints: {
    trafficZones: TRAFFIC_ZONES,
    weatherZones: WEATHER_SYSTEMS,
    piracyZones: PIRACY_ZONES,
    dangerZones: DANGER_ZONES,
  },
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ship-route-optimizer-backend" });
});

router.get("/optimizer-metadata", (_req, res) => {
  return res.json({
    meta: buildOptimizerMeta(),
  });
});

router.post("/optimize-route", async (req, res) => {
  try {
    const missing = requiredFields.filter((field) => !req.body?.[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missing,
      });
    }

    if (req.body.startPort === req.body.destinationPort) {
      return res.status(400).json({
        error: "startPort and destinationPort must be different",
      });
    }

    const routes = optimizeRouteSet(req.body);
    const persistence = await persistOptimizedRoutes({ routes, request: req.body });

    return res.json({
      routes,
      persistence,
      meta: buildOptimizerMeta(),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to optimize route",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
