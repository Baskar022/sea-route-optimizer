import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseServiceConfig } from "../config/env.js";

const supabase = hasSupabaseServiceConfig
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const persistOptimizedRoutes = async ({ routes, request }) => {
  if (!supabase || !routes.length) {
    return { persisted: 0, reason: "supabase-unconfigured-or-no-routes" };
  }

  let persisted = 0;
  for (const route of routes) {
    const { data: routeRow, error: routeError } = await supabase
      .from("routes")
      .insert({
        name: route.name,
        origin: request.startPort,
        destination: request.destinationPort,
        distance: route.distance,
        estimated_time: route.eta,
        fuel_consumption: route.fuel,
        risk_level: route.risk,
        weather_conditions: route.weather,
        user_id: request.userId || null,
        status: "planned",
        optimization_score: route.score,
        scoring_breakdown: route.scoringBreakdown,
        algorithm: "astar-haversine-weighted",
        route_coords: route.coords,
        route_cost_inr: route.cost,
        baseline_cost_inr: route.baselineCostInr,
        savings_inr: route.routeSavingsInr,
        travel_hours: route.travelHours,
        baseline_distance_nm: route.baselineDistanceNm,
        fuel_saved_ton: route.routeFuelSavedTon,
      })
      .select("id")
      .single();

    if (routeError || !routeRow) {
      // Continue other routes so a single insert failure does not drop the whole batch.
      continue;
    }

    const waypointRows = route.waypoints.map((wp, index) => ({
      route_id: routeRow.id,
      latitude: wp.lat,
      longitude: wp.lng,
      name: wp.name,
      order_index: index,
    }));

    await supabase.from("waypoints").insert(waypointRows);
    persisted += 1;
  }

  return { persisted };
};
