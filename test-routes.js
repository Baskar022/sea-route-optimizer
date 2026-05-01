const http = require('http');

async function testRoute(start, end) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      startPort: start,
      destinationPort: end,
      departureTime: new Date().toISOString(),
      shipType: 'Container Ship',
      optimizationGoal: 'balanced'
    });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/optimize-route',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const route = json.routes[0];
          resolve({pair: `${start} → ${end}`, waypoints: route.coords.length, distance: route.distance});
        } catch {
          resolve({pair: `${start} → ${end}`, error: true});
        }
      });
    });
    req.on('error', () => resolve({pair: `${start} → ${end}`, error: true}));
    req.write(data);
    req.end();
  });
}

async function test() {
  const routes = [
    ['Shanghai, China', 'Rotterdam, Netherlands'],
    ['Port of Los Angeles', 'Port of Singapore'],
    ['Mumbai, India', 'Singapore'],
    ['Port of Busan', 'Port of Shanghai']
  ];
  
  for (const [s, e] of routes) {
    const result = await testRoute(s, e);
    if (result.error) {
      console.log(`✗ ${result.pair}: ERROR`);
    } else {
      console.log(`✓ ${result.pair}: ${result.waypoints} waypoints, ${result.distance} NM`);
    }
  }
}

test();
