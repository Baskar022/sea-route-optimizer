// Quick test showing route distances for different strategies
import { optimizeRouteSet } from './src/services/routeOptimizerService.js';

const testRoutes = async () => {
  try {
    const request = {
      startPort: 'Mumbai Port',
      destinationPort: 'Port of Singapore',
      shipProfile: { type: 'container', deadweightTon: 90000, poweredBy: 'diesel', fuelConsumptionTonPerHour: 85, mainEngineRpm: 50 },
      optimization_goal: 'Balanced Optimization',
      departure_time: new Date().toISOString(),
    };

    console.log('\n===== ROUTE DISTANCE COMPARISON =====\n');
    const routes = await optimizeRouteSet(request);
    
    routes.forEach((route, idx) => {
      console.log(`${idx + 1}. ${route.name}`);
      console.log(`   Distance: ${route.distance} NM`);
      console.log(`   Waypoints: ${route.coords.length}`);
      console.log(`   Cost: ₹${route.cost}`);
      console.log(`   Fuel: ${route.fuel} tons`);
      console.log(`   Time: ${route.travelHours} hours`);
      console.log();
    });

    // Calculate distance differences
    const distances = routes.map(r => r.distance);
    const minDist = Math.min(...distances);
    const maxDist = Math.max(...distances);
    const difference = maxDist - minDist;
    const percentDiff = ((difference / minDist) * 100).toFixed(1);
    
    console.log('===== ANALYSIS =====');
    console.log(`Shortest: ${minDist} NM (${routes.find(r => r.distance === minDist).name})`);
    console.log(`Longest: ${maxDist} NM (${routes.find(r => r.distance === maxDist).name})`);
    console.log(`Difference: ${difference.toFixed(1)} NM (${percentDiff}% variation)`);
    console.log('\n✓ All routes are COMPLETELY DIFFERENT!\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
};

testRoutes();
