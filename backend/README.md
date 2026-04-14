# Ship Route Optimizer Backend

Express backend for A* maritime route optimization with weighted scoring and Supabase persistence.

## Endpoints

- `GET /api/health`
- `POST /api/optimize-route`

## Request Body (`POST /api/optimize-route`)

```json
{
  "startPort": "Mumbai, India",
  "destinationPort": "Singapore",
  "departureTime": "2026-04-08",
  "shipType": "Container Ship",
  "optimizationGoal": "Balanced Optimization",
  "speedKnots": 16,
  "costPreference": 0.6,
  "userId": "optional-supabase-user-id"
}
```

## Response Notes

- Returns `routes` array with map-friendly `coords` as `[[lng, lat], ...]`.
- Each route contains `waypoints` in `{ name, lat, lng }` format for Leaflet rendering.
- Uses A* with Haversine heuristic and weighted factors: distance, fuel, weather risk, traffic, piracy.

## Run

1. Copy `backend/.env.example` to `backend/.env` and set values.
2. Start backend: `npm run backend:start`.
3. Frontend should point to `VITE_BACKEND_URL` (defaults to `http://localhost:4000`).
