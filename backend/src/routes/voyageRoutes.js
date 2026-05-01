import { Router } from "express";
import {
  getVoyageMetrics,
  updateVoyageStatus,
  getVoyagesByStatus,
  getVoyageDetails,
  cancelVoyage,
  completeVoyage,
  startVoyage,
} from "../services/voyageTrackingService.js";

const router = Router();

/**
 * GET /api/voyages/metrics/:userId
 * Get cumulative voyage metrics for a user
 */
router.get("/metrics/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const metrics = await getVoyageMetrics(userId);
    if (!metrics) {
      return res.status(500).json({ error: "Failed to fetch metrics" });
    }

    return res.json({ metrics });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to get voyage metrics",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/voyages/status/:userId/:status
 * Get voyages filtered by status
 */
router.get("/status/:userId/:status", async (req, res) => {
  try {
    const { userId, status } = req.params;
    if (!userId || !status) {
      return res.status(400).json({ error: "User ID and status are required" });
    }

    const voyages = await getVoyagesByStatus(userId, status);
    return res.json({ voyages });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch voyages",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/voyages/details/:voyageId
 * Get detailed information about a specific voyage
 */
router.get("/details/:voyageId", async (req, res) => {
  try {
    const { voyageId } = req.params;
    if (!voyageId) {
      return res.status(400).json({ error: "Voyage ID is required" });
    }

    const voyage = await getVoyageDetails(voyageId);
    if (!voyage) {
      return res.status(404).json({ error: "Voyage not found" });
    }

    return res.json({ voyage });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch voyage details",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/voyages/status/:voyageId
 * Update voyage status (planned, in-progress, completed, cancelled)
 */
router.post("/status/:voyageId", async (req, res) => {
  try {
    const { voyageId } = req.params;
    const { status } = req.body;

    if (!voyageId || !status) {
      return res.status(400).json({ error: "Voyage ID and status are required" });
    }

    const result = await updateVoyageStatus(voyageId, status);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update voyage status",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/voyages/complete/:voyageId
 * Mark a voyage as completed
 */
router.post("/complete/:voyageId", async (req, res) => {
  try {
    const { voyageId } = req.params;
    if (!voyageId) {
      return res.status(400).json({ error: "Voyage ID is required" });
    }

    const result = await completeVoyage(voyageId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to complete voyage",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/voyages/cancel/:voyageId
 * Cancel a planned voyage
 */
router.post("/cancel/:voyageId", async (req, res) => {
  try {
    const { voyageId } = req.params;
    if (!voyageId) {
      return res.status(400).json({ error: "Voyage ID is required" });
    }

    const result = await cancelVoyage(voyageId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to cancel voyage",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/voyages/start/:voyageId
 * Start a planned voyage (transition to in-progress)
 */
router.post("/start/:voyageId", async (req, res) => {
  try {
    const { voyageId } = req.params;
    if (!voyageId) {
      return res.status(400).json({ error: "Voyage ID is required" });
    }

    const result = await startVoyage(voyageId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to start voyage",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
