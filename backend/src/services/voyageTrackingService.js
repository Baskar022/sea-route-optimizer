import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseServiceConfig } from "../config/env.js";

const supabase = hasSupabaseServiceConfig
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

/**
 * Voyage tracking and analytics service
 * Handles voyage status updates and cumulative metrics
 */

export const getVoyageMetrics = async (userId) => {
  if (!supabase || !userId) {
    return {
      totalPlanned: 0,
      totalCompleted: 0,
      totalCancelled: 0,
      totalCostSavingsInr: 0,
      totalFuelSavedTon: 0,
      avgEfficiencyScore: 0,
      avgTravelHours: 0,
      activeVoyages: 0,
    };
  }

  try {
    const { data: routes, error } = await supabase
      .from("routes")
      .select("status, savings_inr, fuel_saved_ton, optimization_score, travel_hours")
      .eq("user_id", userId);

    if (error || !routes) {
      console.error("Error fetching voyage metrics:", error);
      return null;
    }

    const asNumber = (value) => (typeof value === "number" ? value : Number(value || 0));

    const planned = routes.filter((r) => r.status === "planned").length;
    const completed = routes.filter((r) => r.status === "completed").length;
    const cancelled = routes.filter((r) => r.status === "cancelled").length;

    const totalCostSavings = routes.reduce((sum, r) => sum + asNumber(r.savings_inr), 0);
    const totalFuelSaved = routes.reduce((sum, r) => sum + asNumber(r.fuel_saved_ton), 0);
    const totalScore = routes.reduce((sum, r) => sum + asNumber(r.optimization_score), 0);
    const totalHours = routes.reduce((sum, r) => sum + asNumber(r.travel_hours), 0);

    return {
      totalPlanned: planned,
      totalCompleted: completed,
      totalCancelled: cancelled,
      totalCostSavingsInr: Math.round(totalCostSavings),
      totalFuelSavedTon: Math.round(totalFuelSaved * 10) / 10,
      avgEfficiencyScore: routes.length > 0 ? totalScore / routes.length : 0,
      avgTravelHours: routes.length > 0 ? totalHours / routes.length : 0,
      activeVoyages: planned,
      allVoyages: routes.length,
    };
  } catch (error) {
    console.error("Unexpected error in getVoyageMetrics:", error);
    return null;
  }
};

export const updateVoyageStatus = async (routeId, newStatus) => {
  if (!supabase || !routeId) {
    return { success: false, error: "Invalid parameters" };
  }

  try {
    // Validate status
    const validStatuses = ["planned", "active", "completed", "cancelled"];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: "Invalid status" };
    }

    const { data, error } = await supabase
      .from("routes")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", routeId)
      .select()
      .single();

    if (error) {
      console.error("Error updating voyage status:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      route: data,
      message: `Voyage status updated to ${newStatus}`,
    };
  } catch (error) {
    console.error("Unexpected error in updateVoyageStatus:", error);
    return { success: false, error: error.message };
  }
};

export const getVoyagesByStatus = async (userId, status) => {
  if (!supabase || !userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("routes")
      .select(
        "id, name, origin, destination, distance, travel_hours, route_cost_inr, savings_inr, fuel_saved_ton, status, created_at, departure_time"
      )
      .eq("user_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching voyages by status:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in getVoyagesByStatus:", error);
    return [];
  }
};

export const getVoyageDetails = async (routeId) => {
  if (!supabase || !routeId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("id", routeId)
      .single();

    if (error) {
      console.error("Error fetching voyage details:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in getVoyageDetails:", error);
    return null;
  }
};

export const cancelVoyage = async (routeId) => {
  if (!supabase || !routeId) {
    return { success: false, error: "Invalid route ID" };
  }

  try {
    // Get current route to verify it can be cancelled
    const current = await getVoyageDetails(routeId);
    if (!current) {
      return { success: false, error: "Voyage not found" };
    }

    if (current.status === "completed" || current.status === "cancelled") {
      return { success: false, error: `Cannot cancel a ${current.status} voyage` };
    }

    const result = await updateVoyageStatus(routeId, "cancelled");
    return result;
  } catch (error) {
    console.error("Unexpected error in cancelVoyage:", error);
    return { success: false, error: error.message };
  }
};

export const completeVoyage = async (routeId) => {
  if (!supabase || !routeId) {
    return { success: false, error: "Invalid route ID" };
  }

  try {
    const current = await getVoyageDetails(routeId);
    if (!current) {
      return { success: false, error: "Voyage not found" };
    }

    if (current.status === "cancelled") {
      return { success: false, error: "Cannot complete a cancelled voyage" };
    }

    const result = await updateVoyageStatus(routeId, "completed");
    return result;
  } catch (error) {
    console.error("Unexpected error in completeVoyage:", error);
    return { success: false, error: error.message };
  }
};

export const startVoyage = async (routeId) => {
  if (!supabase || !routeId) {
    return { success: false, error: "Invalid route ID" };
  }

  try {
    const current = await getVoyageDetails(routeId);
    if (!current) {
      return { success: false, error: "Voyage not found" };
    }

    if (current.status !== "planned") {
      return { success: false, error: `Cannot start a ${current.status} voyage` };
    }

    const result = await updateVoyageStatus(routeId, "active");
    return result;
  } catch (error) {
    console.error("Unexpected error in startVoyage:", error);
    return { success: false, error: error.message };
  }
};
