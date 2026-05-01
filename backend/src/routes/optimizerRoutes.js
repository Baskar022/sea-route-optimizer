import { Router } from "express";
import { optimizeRouteSet, validateRouteLandCrossing } from "../services/routeOptimizerService.js";
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

    // Generate routes WITHOUT persisting them
    const routes = optimizeRouteSet(req.body);

    return res.json({
      routes,
      meta: buildOptimizerMeta(),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to optimize route",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/save-route", async (req, res) => {
  try {
    const { route, userId } = req.body;
    
    if (!route || !userId) {
      return res.status(400).json({
        success: false,
        error: "Missing route or userId",
      });
    }

    // STRICT land validation - reject any route with significant land crossings
    const crossesLand = validateRouteLandCrossing(route);
    if (crossesLand) {
      return res.status(400).json({
        success: false,
        error: "Route crosses land. Maritime-only routes are required. Please select a different route or regenerate.",
      });
    }

    // Additional check: if frontend marked it as crossing land, reject
    if (route.landCrossing) {
      return res.status(400).json({
        success: false,
        error: "Route crosses land and cannot be saved. Please select a different route.",
      });
    }

    // Persist the selected route with status 'planned'
    const persistence = await persistOptimizedRoutes({ 
      routes: [route], 
      userId: userId
    });

    if (!persistence.persisted || persistence.persisted === 0) {
      throw new Error(persistence.reason || "Failed to save route");
    }

    return res.json({
      success: true,
      route: persistence.routes?.[0],
      message: "Route saved successfully! Ready to start your voyage.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to save route",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
