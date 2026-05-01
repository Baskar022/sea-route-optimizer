import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OptimizationMeta, RouteOption } from '@/data/mockRoutes';
import { maritimeZones, riskColorMap } from '@/data/maritimeZones';

// Fix for default markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
  routes?: RouteOption[];
  selectedRoute?: RouteOption | null;
  activeRoute?: any;
  constraints?: OptimizationMeta['constraints'];
  onRouteClick?: (route: RouteOption) => void;
}

const LeafletMap = ({ routes = [], selectedRoute, activeRoute, constraints, onRouteClick }: LeafletMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const currentPositionMarkerRef = useRef<L.Marker | null>(null);
  const zoneLayersRef = useRef<L.Layer[]>([]);

  const getRenderableZones = () => {
    const metaZones = [
      ...(constraints?.trafficZones || []).map((zone) => ({ ...zone, category: 'traffic' as const })),
      ...(constraints?.weatherZones || []).map((zone) => ({ ...zone, category: 'weather' as const })),
      ...(constraints?.piracyZones || []).map((zone) => ({ ...zone, category: 'piracy' as const })),
      ...(constraints?.dangerZones || []).map((zone) => ({ ...zone, category: 'danger' as const })),
    ];

    if (metaZones.length === 0) {
      return maritimeZones;
    }

    return metaZones.map((zone, index) => ({
      id: zone.id || `${zone.category}-${index}`,
      name: zone.name,
      category: zone.category,
      riskLevel: zone.riskLevel,
      center: zone.center,
      radiusNm: zone.radiusNm,
    }));
  };

  const renderZoneOverlays = () => {
    if (!mapRef.current) return;

    zoneLayersRef.current.forEach((layer) => layer.remove());
    zoneLayersRef.current = [];

    const zones = getRenderableZones();
    zones.forEach((zone) => {
      const fillColor = riskColorMap[zone.riskLevel];
      const circle = L.circle([zone.center[1], zone.center[0]], {
        radius: zone.radiusNm * 1852,
        color: fillColor,
        fillColor,
        fillOpacity: zone.category === 'danger' || zone.category === 'piracy' ? 0.25 : 0.15,
        weight: zone.riskLevel === 'High' ? 2 : 1,
        dashArray: zone.riskLevel === 'High' ? '6,4' : undefined,
      })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family: system-ui; padding: 8px;">
            <strong>${zone.name}</strong><br/>
            <small>Type: ${zone.category}</small><br/>
            <small>Risk: ${zone.riskLevel}</small>
          </div>
        `);

      zoneLayersRef.current.push(circle);
    });
  };

  const getRoutePoints = (route: RouteOption) => {
    if (route.coords && route.coords.length > 0) {
      return route.coords.map(([lng, lat]) => [lat, lng] as [number, number]);
    }

    if (route.waypoints && route.waypoints.length > 0) {
      return route.waypoints.map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number]);
    }

    return [];
  };

  const addRouteMarkers = (route: RouteOption, color: string) => {
    const points = getRoutePoints(route);
    if (!points.length) return;

    const sampledIndexes = new Set([0, Math.floor(points.length / 2), points.length - 1]);
    points.forEach((point, index) => {
      if (!sampledIndexes.has(index)) return;

      const marker = L.circleMarker(point, {
        radius: index === 0 || index === points.length - 1 ? 5 : 4,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(mapRef.current!)
        .bindPopup(index === 0 ? "Start" : index === points.length - 1 ? "Destination" : "Mid route");
      markersRef.current.push(marker as unknown as L.Marker);
    });
  };

  useEffect(() => {
    if (!mapRef.current) {
      // Initialize map
      mapRef.current = L.map('leaflet-map').setView([20, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      renderZoneOverlays();
    }

    return () => {
      if (mapRef.current) {
        zoneLayersRef.current.forEach((layer) => layer.remove());
        zoneLayersRef.current = [];
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    renderZoneOverlays();
  }, [constraints]);

  // Update map when routes or selected route changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (selectedRoute && getRoutePoints(selectedRoute).length > 0) {
      // Draw selected route - THICK and DARK for high visibility
      const points = getRoutePoints(selectedRoute);
      
      // Add dark background layer for better contrast
      L.polyline(points, {
        color: '#000000',
        weight: 10,
        opacity: 0.3,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(mapRef.current);

      // Main route line - thick and vibrant
      polylineRef.current = L.polyline(points, {
        color: '#0066cc',  // Deep blue - very visible
        weight: 7,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
        className: 'maritime-route-active'
      }).addTo(mapRef.current);

      addRouteMarkers(selectedRoute, '#0066cc');

      // Fit map to route bounds
      mapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
    } else if (routes.length > 0 && getRoutePoints(routes[0]).length > 0) {
      // Show first route if no selection - still thick for visibility
      const firstRoute = routes[0];
      const points = getRoutePoints(firstRoute);
      
      // Background layer
      L.polyline(points, {
        color: '#000000',
        weight: 8,
        opacity: 0.2,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(mapRef.current);

      // Main route line
      polylineRef.current = L.polyline(points, {
        color: '#1e40af',  // Navy blue - prominent
        weight: 5,
        opacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round',
        className: 'maritime-route-default'
      }).addTo(mapRef.current);

      addRouteMarkers(firstRoute, '#1e40af');

      mapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
    }
  }, [routes, selectedRoute]);

  // Update active route position
  useEffect(() => {
    if (!mapRef.current || !activeRoute) return;

    if (activeRoute.current_latitude && activeRoute.current_longitude) {
      // Remove old position marker
      if (currentPositionMarkerRef.current) {
        currentPositionMarkerRef.current.remove();
      }

      // Create custom icon for current position
      const currentPositionIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background: hsl(var(--primary));
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
          "></div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
          </style>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      // Add new position marker
      currentPositionMarkerRef.current = L.marker(
        [activeRoute.current_latitude, activeRoute.current_longitude],
        { icon: currentPositionIcon }
      ).addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family: system-ui; padding: 8px;">
            <strong>${activeRoute.name}</strong>
            <br/>
            <small>Speed: ${activeRoute.speed || 0} knots</small>
            <br/>
            <small>Last Update: ${activeRoute.last_position_update ? new Date(activeRoute.last_position_update).toLocaleTimeString() : 'N/A'}</small>
          </div>
        `);

      // Pan to current position
      mapRef.current.setView([activeRoute.current_latitude, activeRoute.current_longitude], 8);
    }
  }, [activeRoute]);

  return (
    <div className="relative w-full h-full min-h-[600px]">
      <div id="leaflet-map" className="absolute inset-0 rounded-lg shadow-lg z-0" />
    </div>
  );
};

export default LeafletMap;
