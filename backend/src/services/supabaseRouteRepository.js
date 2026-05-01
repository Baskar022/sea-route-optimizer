import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseServiceConfig } from "../config/env.js";

const supabase = hasSupabaseServiceConfig
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const persistOptimizedRoutes = async ({ routes, request, userId = null }) => {
  if (!supabase || !routes.length) {
    return { persisted: 0, reason: "supabase-unconfigured-or-no-routes" };
  }

  let persisted = 0;
  const persistedRoutes = [];
  
  for (const route of routes) {
    try {
      // Support both direct route fields and request context
      const startPort = route.startPort || request?.startPort || "Unknown Port";
      const endPort = route.destinationPort || request?.destinationPort || "Unknown Port";
      
      // Prepare route data with all required fields
      const routeData = {
        name: route.name || route.routeType || "Unnamed Route",
        origin: startPort,
        destination: endPort,
        distance: route.distance || route.baseline_distance_nm || 0,
        estimated_time: route.eta || route.estimated_time || "N/A",
        fuel_consumption: route.fuel || route.fuel_consumption || 0,
        risk_level: route.risk || route.risk_level || "Medium",
        weather_conditions: route.weather || `Composite weather risk index ${route.scoringBreakdown?.weatherIndex || 0}`,
        user_id: userId || request?.userId || null,
        status: "planned",
        optimization_score: route.score || route.optimization_score || 0,
        scoring_breakdown: route.scoringBreakdown || {},
        algorithm: "astar-haversine-weighted",
        route_coords: route.coords || route.route_coords || [],
        route_cost_inr: route.cost || route.route_cost_inr || 0,
        baseline_cost_inr: route.baselineCostInr || route.baseline_cost_inr || 0,
        savings_inr: route.routeSavingsInr || route.savings_inr || 0,
        travel_hours: route.travelHours || route.travel_hours || 0,
        baseline_distance_nm: route.baselineDistanceNm || route.baseline_distance_nm || 0,
        fuel_saved_ton: route.routeFuelSavedTon || route.fuel_saved_ton || 0,
        land_crossing: route.landCrossing || false,
        waypoints: route.waypoints || [],
        departure_time: request?.departureTime || route.departure_time || new Date().toISOString(),
        ship_type: request?.shipType || route.ship_type || "Container Ship",
        optimization_goal: request?.optimizationGoal || route.optimization_goal || "Balanced Optimization",
      };

      console.log(`[Persist] Saving route: ${startPort} → ${endPort}, User: ${routeData.user_id}, Distance: ${routeData.distance} NM`);

      const { data: routeRow, error: routeError } = await supabase
        .from("routes")
        .insert(routeData)
        .select("id")
        .single();

      if (routeError || !routeRow) {
        console.error("Route insertion error:", routeError);
        continue;
      }

      console.log(`[Persist] ✓ Route saved with ID: ${routeRow.id}`);

      persistedRoutes.push({
        id: routeRow.id,
        name: routeData.name,
        distance: routeData.distance,
        cost: routeData.route_cost_inr,
      });
      persisted += 1;
    } catch (err) {
      console.error("Unexpected error persisting route:", err);
      continue;
    }
  }

  return { 
    persisted, 
    routes: persistedRoutes,
    reason: persisted === 0 ? "all-inserts-failed" : undefined
  };
};
