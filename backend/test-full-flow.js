// Comprehensive end-to-end flow test
import { optimizeRouteSet, validateRouteLandCrossing } from './src/services/routeOptimizerService.js';
import { persistOptimizedRoutes } from './src/services/supabaseRouteRepository.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xfzhqfzsvnquhgkibfwy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('[TEST] SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const fullFlowTest = async () => {
  try {
    console.log('===== COMPLETE FLOW TEST =====\n');

    // Step 1: Generate routes
    console.log('STEP 1: Generate Routes');
    console.log('---');
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

    const routes = await optimizeRouteSet(request);
    console.log(`✓ Generated ${routes.length} routes`);
    
    if (routes.length === 0) {
      console.error('✗ No routes generated!');
      process.exit(1);
    }

    const selectedRoute = routes[0];
    console.log(`✓ Selected route: ${selectedRoute.name} (${selectedRoute.coords?.length || 0} waypoints)`);

    // Step 2: Validate route
    console.log('\nSTEP 2: Validate Route');
    console.log('---');
    const routeForValidation = {
      coords: selectedRoute.coords,
      startPort: 'Mumbai Port',
      destinationPort: 'Port of Singapore',
    };
    const crossesLand = validateRouteLandCrossing(routeForValidation);
    console.log(`✓ Land crossing check: ${crossesLand ? 'FAIL' : 'PASS'}`);
    
    if (crossesLand) {
      console.error('✗ Route crosses land!');
      process.exit(1);
    }

    // Step 3: Save route
    console.log('\nSTEP 3: Save Route to Database');
    console.log('---');
    
    // Create test user first
    const { data: { users } } = await supabase.auth.admin.listUsers();
    let userId = null;
    
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log(`✓ Using existing user: ${userId}`);
    } else {
      console.warn('⚠ No users found, using mock userId');
      userId = 'test-user-' + Date.now();
    }

    // Add metadata for persistence
    const routeToSave = {
      ...selectedRoute,
      startPort: 'Mumbai Port',
      destinationPort: 'Port of Singapore',
    };

    const persistence = await persistOptimizedRoutes({
      routes: [routeToSave],
      userId: userId,
    });

    console.log(`✓ Routes persisted: ${persistence.persisted}`);
    
    if (persistence.persisted === 0) {
      console.error(`✗ Failed to persist route: ${persistence.reason}`);
      process.exit(1);
    }

    const routeId = persistence.routes?.[0]?.id;
    console.log(`✓ Route ID: ${routeId}`);

    // Step 4: Retrieve saved route
    console.log('\nSTEP 4: Retrieve Saved Route');
    console.log('---');
    
    const { data: savedRoute, error: fetchError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .single();

    if (fetchError || !savedRoute) {
      console.error(`✗ Failed to retrieve route: ${fetchError?.message}`);
      process.exit(1);
    }

    console.log(`✓ Route retrieved from database`);
    console.log(`  - Status: ${savedRoute.status}`);
    console.log(`  - Distance: ${savedRoute.distance} NM`);
    console.log(`  - Cost: ₹${savedRoute.route_cost_inr}`);

    // Step 5: Attempt to start voyage (update status)
    console.log('\nSTEP 5: Start Voyage (Update Status)');
    console.log('---');

    const { data: updatedRoute, error: updateError } = await supabase
      .from('routes')
      .update({ 
        status: 'active',
      })
      .eq('id', routeId)
      .select()
      .single();

    if (updateError || !updatedRoute) {
      console.error(`✗ Failed to update route status: ${updateError?.message}`);
      process.exit(1);
    }

    console.log(`✓ Voyage started successfully`);
    console.log(`  - New status: ${updatedRoute.status}`);
    console.log(`  - Start time: ${updatedRoute.actual_start_time}`);

    // Step 6: Query active routes
    console.log('\nSTEP 6: Query Active Routes (Live Tracking)');
    console.log('---');

    const { data: activeRoutes, error: activeError } = await supabase
      .from('routes')
      .select('id, origin, destination, status, distance, route_coords, waypoints, risk_level')
      .eq('status', 'active')
      .limit(5);

    if (activeError) {
      console.error(`✗ Failed to query active routes: ${activeError.message}`);
      process.exit(1);
    }

    console.log(`✓ Found ${activeRoutes?.length || 0} active routes`);
    if (activeRoutes && activeRoutes.length > 0) {
      const activeRoute = activeRoutes[0];
      console.log(`  - Route: ${activeRoute.origin} → ${activeRoute.destination}`);
      console.log(`  - Waypoints: ${activeRoute.waypoints?.length || 0}`);
      console.log(`  - Distance: ${activeRoute.distance} NM`);
    }

    console.log('\n===== TEST COMPLETE (ALL STEPS PASSED) =====\n');
    process.exit(0);
    
  } catch (err) {
    console.error('\n[TEST] Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

fullFlowTest();
