import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ship, MapPin, Clock, Navigation, Activity } from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActiveRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance: number;
  estimated_time: string;
  current_latitude: number | null;
  current_longitude: number | null;
  speed: number;
  status: string;
  created_at: string;
  last_position_update: string | null;
}

const RouteTracking = () => {
  const [activeRoutes, setActiveRoutes] = useState<ActiveRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ActiveRoute | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchActiveRoutes();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchActiveRoutes = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['in_progress', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active routes:', error);
      return;
    }

    if (data) {
      setActiveRoutes(data as ActiveRoute[]);
      if (data.length > 0 && !selectedRoute) {
        setSelectedRoute(data[0] as ActiveRoute);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('route-position-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'routes',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Route updated:', payload);
          const updatedRoute = payload.new as ActiveRoute;
          
          setActiveRoutes(prev => 
            prev.map(route => 
              route.id === updatedRoute.id ? updatedRoute : route
            )
          );

          if (selectedRoute?.id === updatedRoute.id) {
            setSelectedRoute(updatedRoute);
          }

          toast({
            title: "Position Updated",
            description: `${updatedRoute.name} location has been updated.`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateETA = (route: ActiveRoute) => {
    if (!route.current_latitude || !route.current_longitude || !route.speed) {
      return route.estimated_time;
    }

    // Simple ETA calculation based on remaining distance and current speed
    // In a real application, this would be more sophisticated
    const remainingDistance = route.distance * 0.7; // Assume 70% remaining
    const hoursRemaining = remainingDistance / route.speed;
    
    return `${Math.round(hoursRemaining)}h`;
  };

  const simulatePositionUpdate = async (routeId: string) => {
    // Simulate position update for demo purposes
    const route = activeRoutes.find(r => r.id === routeId);
    if (!route) return;

    // Generate random position (in real app, this would come from GPS/AIS)
    const newLat = (route.current_latitude || 0) + (Math.random() - 0.5) * 0.1;
    const newLng = (route.current_longitude || 0) + (Math.random() - 0.5) * 0.1;
    const newSpeed = 15 + Math.random() * 10;

    const { error } = await supabase
      .from('routes')
      .update({
        current_latitude: newLat,
        current_longitude: newLng,
        speed: newSpeed,
        last_position_update: new Date().toISOString()
      })
      .eq('id', routeId);

    if (error) {
      console.error('Error updating position:', error);
      toast({
        title: "Error",
        description: "Failed to update position.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="bg-card border-b border-border shadow-wave">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-ocean">
                Live Route Tracking
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor your active voyages in real-time
              </p>
            </div>
            <Badge variant="default" className="px-3 py-1">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              {activeRoutes.length} Active
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Routes List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="maritime-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Ship className="w-5 h-5 text-primary" />
                  <span>Active Voyages</span>
                </CardTitle>
                <CardDescription>
                  Click to view details and track
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeRoutes.length > 0 ? (
                  activeRoutes.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedRoute?.id === route.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{route.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {route.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3 h-3" />
                          <span>{route.origin} → {route.destination}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>ETA: {calculateETA(route)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Navigation className="w-3 h-3" />
                          <span>Speed: {route.speed || 0} knots</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          simulatePositionUpdate(route.id);
                        }}
                      >
                        Simulate Update
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ship className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active voyages</p>
                    <p className="text-xs mt-1">Start a route to track it here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Map View */}
          <div className="lg:col-span-2">
            <Card className="maritime-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>Live Position</span>
                </CardTitle>
                <CardDescription>
                  {selectedRoute
                    ? `Tracking ${selectedRoute.name}`
                    : 'Select a voyage to track'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeafletMap activeRoute={selectedRoute} />
                
                {selectedRoute && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="text-lg font-semibold">{selectedRoute.distance} nm</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Speed</p>
                      <p className="text-lg font-semibold">{selectedRoute.speed || 0} kts</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">ETA</p>
                      <p className="text-lg font-semibold">{calculateETA(selectedRoute)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-lg font-semibold capitalize">{selectedRoute.status}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteTracking;
