// Quick test of the new A* routing
import { optimizeRouteSet, validateRouteLandCrossing } from './src/services/routeOptimizerService.js';

const testRoute = async () => {
  try {
    const request = {
      startPort: 'Mumbai Port',
      destinationPort: 'Port of Singapore',
      shipProfile: {
        type: 'container',
        deadweightTon: 90000,
        poweredBy: 'diesel',
        fuelConsumptionTonPerHour: 85,
        mainEngineRpm: 50,
      },
      optimization_goal: 'Balanced Optimization',
      departure_time: new Date().toISOString(),
    };

    console.log('[TEST] Starting route optimization...');
    const routes = await optimizeRouteSet(request);
    
    console.log('[TEST] Routes generated:');
    routes.forEach((route, idx) => {
      console.log(`  Route ${idx + 1} (${route.name}):`);
      console.log(`    - Waypoints: ${route.coords?.length || 0}`);
      console.log(`    - Distance: ${route.distance} NM`);
      console.log(`    - Cost: ₹${route.cost}`);
      console.log(`    - Fuel: ${route.fuel} tons`);
      console.log(`    - Travel time: ${route.travelHours} hours`);
    });
    
    // Try to save the first route
    if (routes.length > 0) {
      console.log('\n[TEST] Attempting to validate first route...');
      const routeObj = {
        coords: routes[0].coords,
        startPort: 'Mumbai Port',
        destinationPort: 'Port of Singapore',
      };
      const crossesLand = validateRouteLandCrossing(routeObj);
      console.log(`  - Route crosses land: ${crossesLand}`);
      console.log(`  - Validation result: ${!crossesLand ? 'PASS' : 'FAIL'}`);
    }
    
    console.log('[TEST] Complete!');
  } catch (err) {
    console.error('[TEST] Error:', err.message);
    console.error(err.stack);
  }
};

testRoute();
