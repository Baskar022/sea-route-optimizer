# Route Optimizer - Technical Implementation Reference

## Complete Field Mapping

### Optimizer Output → Database Schema

| Optimizer Field | JSON Path | DB Column | Type | Source |
|---|---|---|---|---|
| name | `route.name` | `name` | TEXT | Route variant: "Fastest Route", "Most Fuel Efficient", etc. |
| cost | `route.cost` | `route_cost_inr` | NUMERIC | Calculated total cost in INR |
| travelHours | `route.travelHours` | `travel_hours` | NUMERIC | Total hours to reach destination |
| landCrossing | `route.landCrossing` | `land_crossing` | BOOLEAN | Whether route crosses land/forbidden zones |
| waypoints | `route.waypoints` | `waypoints` | JSONB | Array of [lng, lat] coordinate pairs |
| distance | `route.distance` | `distance` | DECIMAL | Total distance in nautical miles |
| scoringBreakdown | `route.scoringBreakdown` | `scoring_breakdown` | JSON | Breakdown of all risk factors |
| Request.startPort | - | `origin` | TEXT | Starting port |
| Request.destinationPort | - | `destination` | TEXT | Destination port |
| Request.departureTime | - | `departure_time` | TIMESTAMP | When ship departs |
| Request.shipType | - | `ship_type` | TEXT | Type of vessel (Container Ship, Tanker, etc.) |
| Request.optimizationGoal | - | `optimization_goal` | TEXT | Optimization method used |
| Request.userId | - | `user_id` | UUID | Owner of the route |

### Fallback Field Mapping
The persistence layer supports multiple field name variations for flexibility:

```javascript
{
  // Primary names (what optimizer generates) → Fallback names
  name: route.name || route.routeType,
  distance: route.distance || route.baseline_distance_nm,
  estimated_time: route.eta || route.estimated_time,
  fuel_consumption: route.fuel || route.fuel_consumption,
  risk_level: route.risk || route.risk_level,
  route_cost_inr: route.cost || route.route_cost_inr,
  travel_hours: route.travelHours || route.travel_hours,
  land_crossing: route.landCrossing || false,
  departure_time: request.departureTime || new Date().toISOString(),
  ship_type: request.shipType || "Container Ship",
  optimization_goal: request.optimizationGoal || "Balanced Optimization",
}
```

## API Endpoint Specification

### POST /api/optimize-route

**Authentication**: None (in dev mode), User ID available for RLS

**Request Body**:
```typescript
{
  startPort: string;           // Port name or coordinate (e.g., "Mumbai, India")
  destinationPort: string;     // Port name or coordinate (e.g., "Singapore")
  departureTime: ISO8601;      // e.g., "2024-01-20T10:00:00Z"
  shipType: string;            // "Container Ship", "Tanker", "Bulk Carrier", "RoRo"
  optimizationGoal: string;    // "Fastest Route" | "Most Fuel Efficient" | "Lowest Cost" | "Balanced Optimization"
  userId?: string;             // Optional, for database RLS
}
```

**Response Success** (200):
```typescript
{
  routes: Route[];                    // Array of 4 optimized routes
  persistence: {
    persisted: number;                // How many routes were saved (0-4)
    routes: SavedRoute[];             // Saved route metadata
    reason?: string;                  // Error reason if persisted === 0
  };
  meta: {
    algorithm: string;                // "astar-haversine-weighted"
    format: string;                   // "coords => [[lng, lat], ...]"
    portsByCountry: Object;           // Reference data
    constraints: {
      trafficZones: Zone[];
      weatherZones: Zone[];
      piracyZones: Zone[];
      dangerZones: Zone[];
    };
  };
}
```

**Response Error** (400/500):
```typescript
{
  error: string;
  missing?: string[];           // If validation fails
  details?: string;             // Error details
}
```

## Route Optimizer Configuration

### Strategy Presets (in routeOptimizerService.js)

```javascript
{
  "Fastest Route": {
    weights: { distance: 0.62, fuel: 0.08, weather: 0.1, traffic: 0.12, piracy: 0.08 },
    speedFactor: 1.14,      // 14% faster than normal
    fuelBurnFactor: 1.18,   // Higher fuel consumption for speed
    costFactor: 1.06,       // Slightly higher cost
    offsetNm: 28,           // How much to offset from dangerous zones
    safetyBias: 0.85,       // Lower safety emphasis
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
    offsetNm: 34,
    safetyBias: 1.0,
  }
}
```

### Scoring Breakdown

Routes include detailed breakdown:
```typescript
scoringBreakdown: {
  distanceScore: number;        // Normalized distance factor
  fuelCostScore: number;        // Fuel consumption cost
  weatherIndex: number;         // Weather risk
  trafficIndex: number;         // Shipping traffic congestion
  piracyIndex: number;          // Piracy risk
  weatherRisk: number;          // Final weather risk
  combinedScore: number;        // Overall optimization score
}
```

## Database Schema

### routes Table
```sql
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance DECIMAL NOT NULL,
  estimated_time TEXT NOT NULL,
  fuel_consumption DECIMAL NOT NULL,
  risk_level TEXT NOT NULL,
  weather_conditions TEXT,
  ship_id UUID REFERENCES public.ships(id),
  user_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optimizer-specific fields (NEW):
  route_cost_inr NUMERIC,
  travel_hours NUMERIC,
  departure_time TIMESTAMP WITH TIME ZONE,
  land_crossing BOOLEAN DEFAULT FALSE,
  waypoints JSONB,                          -- [[lng,lat], [lng,lat], ...]
  optimization_goal TEXT,
  ship_type TEXT,
  optimization_score NUMERIC,
  scoring_breakdown JSONB,
  algorithm TEXT,
  route_coords JSONB,
  baseline_cost_inr NUMERIC,
  savings_inr NUMERIC,
  baseline_distance_nm NUMERIC,
  fuel_saved_ton NUMERIC
);
```

## Example Data Flow

### Request:
```json
{
  "startPort": "Mumbai, India",
  "destinationPort": "Singapore",
  "departureTime": "2024-01-20T10:00:00Z",
  "shipType": "Container Ship",
  "optimizationGoal": "Balanced Optimization",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Route Generated (Example):
```json
{
  "name": "Balanced Optimization",
  "cost": 6663171,
  "travelHours": 98.5,
  "distance": 2150,
  "fuel": 185,
  "landCrossing": true,
  "waypoints": [
    [72.8479, 18.9520],    // Mumbai
    [73.1, 19.0],          // Movement northeast
    [74.5, 19.5],          // Continued path
    // ... 644 more waypoints ...
    [103.8198, 1.3521]     // Singapore
  ],
  "eta": "98 hours",
  "risk": "Medium",
  "scoringBreakdown": {
    "distanceScore": 2150,
    "fuelCostScore": 1900000,
    "weatherIndex": 0.35,
    "trafficIndex": 0.45,
    "piracyIndex": 0.25,
    "weatherRisk": "Medium",
    "combinedScore": 0.85
  }
}
```

### Database Insert:
```javascript
{
  name: "Balanced Optimization",
  origin: "Mumbai, India",
  destination: "Singapore",
  distance: 2150,
  estimated_time: "98 hours",
  fuel_consumption: 185,
  risk_level: "Medium",
  weather_conditions: "...",
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  status: "planned",
  route_cost_inr: 6663171,
  travel_hours: 98.5,
  departure_time: "2024-01-20T10:00:00Z",
  land_crossing: true,
  waypoints: [...644 coordinates...],
  optimization_goal: "Balanced Optimization",
  ship_type: "Container Ship",
  // ... plus other fields ...
}
```

## Supabase RLS Policies

Routes can be viewed/modified only by:
1. User who created the route (user_id = auth.uid())
2. Ship owner (via ship_id relationship)
3. Admins (via role check on profiles table)

## Error Handling

### Common Errors:

| Error | Cause | Fix |
|-------|-------|-----|
| "Could not find the 'departure_time' column" | Migration not applied | `supabase db push` |
| "Missing required fields" | Request incomplete | Check all 5 fields present |
| "startPort and destinationPort must be different" | Same port specified | Use different ports |
| "all-inserts-failed" | DB schema mismatch or RLS | Check migration, user_id |
| PGRST204 | Unknown column | Migration not applied |

## Testing

### Local Test (Node.js):
```javascript
import { optimizeRouteSet } from './backend/src/services/routeOptimizerService.js';
import { persistOptimizedRoutes } from './backend/src/services/supabaseRouteRepository.js';

const routes = optimizeRouteSet({
  startPort: "Mumbai, India",
  destinationPort: "Singapore",
  departureTime: new Date().toISOString(),
  shipType: "Container Ship",
  optimizationGoal: "Balanced Optimization",
  userId: "test-user-123"
});

const result = await persistOptimizedRoutes({ routes, request, userId });
console.log(`Persisted ${result.persisted} routes`);
```

### Via API:
```bash
curl -X POST http://localhost:3001/api/optimize-route \
  -H "Content-Type: application/json" \
  -d '{"startPort":"Mumbai, India","destinationPort":"Singapore","departureTime":"2024-01-20T10:00:00Z","shipType":"Container Ship","optimizationGoal":"Balanced Optimization","userId":"test-user-123"}'
```

## Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| Route generation | ~500ms | 4 routes, 2000+ waypoints total |
| Waypoint smoothing | ~200ms | High-accuracy geographic smoothing |
| Database insert | ~100-300ms | 4 routes × 4 inserts |
| Total roundtrip | ~800ms-1s | From request to DB |

## Monitoring

Log these for investigation:
```javascript
console.log("Generated", routes.length, "routes");
console.log("Waypoints per route:", routes.map(r => r.waypoints.length));
console.log("Persisted", result.persisted, "routes");
if (result.reason) console.error("Persistence error:", result.reason);
```
