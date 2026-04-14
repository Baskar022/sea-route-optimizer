import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Navigation, 
  Route, 
  Info,
  ExternalLink,
  Settings
} from "lucide-react";
import { RouteOption } from "@/data/mockRoutes";
import { useState } from "react";

interface MapPlaceholderProps {
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
}

const MapPlaceholder = ({ routes, selectedRoute }: MapPlaceholderProps) => {
  const [mapboxToken, setMapboxToken] = useState("");

  return (
    <div className="space-y-6">
      {/* Map Container */}
      <Card className="maritime-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Interactive Route Map</span>
              </CardTitle>
              <CardDescription>
                Visualize your optimized maritime routes on an interactive world map
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Settings className="w-3 h-3" />
              <span>Setup Required</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Map Placeholder */}
            <div 
              className="w-full h-96 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-dashed border-border rounded-lg flex items-center justify-center relative overflow-hidden"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-8 h-full">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className="border-r border-b border-muted-foreground/20" />
                  ))}
                </div>
              </div>

              {/* Mock Route Lines */}
              {routes.length > 0 && (
                <>
                  <svg 
                    className="absolute inset-0 w-full h-full" 
                    viewBox="0 0 400 200"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="routeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.8" />
                      </linearGradient>
                      <linearGradient id="routeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.6" />
                      </linearGradient>
                    </defs>
                    
                    {/* Route 1 - Direct */}
                    <path
                      d="M 50 100 Q 200 80 350 120"
                      stroke="url(#routeGradient1)"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="5,5"
                      className="animate-pulse"
                    />
                    
                    {/* Route 2 - Northern */}
                    <path
                      d="M 50 100 Q 150 60 250 70 Q 300 75 350 120"
                      stroke="url(#routeGradient2)"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="3,3"
                    />
                    
                    {/* Route 3 - Southern */}
                    <path
                      d="M 50 100 Q 120 140 200 130 Q 280 125 350 120"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="2"
                      fill="none"
                      strokeOpacity="0.5"
                    />
                  </svg>

                  {/* Port Markers */}
                  <div className="absolute top-1/2 left-12 transform -translate-y-1/2">
                    <div className="w-4 h-4 bg-primary rounded-full border-2 border-background shadow-lg animate-pulse"></div>
                    <div className="text-xs font-medium mt-1 text-primary">Start Port</div>
                  </div>
                  
                  <div className="absolute top-1/2 right-12 transform -translate-y-1/2">
                    <div className="w-4 h-4 bg-secondary rounded-full border-2 border-background shadow-lg animate-pulse"></div>
                    <div className="text-xs font-medium mt-1 text-secondary">Destination</div>
                  </div>
                </>
              )}

              {/* Center Content */}
              <div className="text-center z-10 bg-background/95 p-6 rounded-lg border border-border shadow-lg max-w-md">
                <Navigation className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Mapbox Integration Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Mapbox account to display interactive maritime routes with real-time data
                </p>
                
                {/* Mapbox Token Input */}
                <div className="space-y-3">
                  <div className="text-left">
                    <Label htmlFor="mapbox-token" className="text-xs">Mapbox Public Token</Label>
                    <Input
                      id="mapbox-token"
                      type="password"
                      placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIi..."
                      value={mapboxToken}
                      onChange={(e) => setMapboxToken(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      className="flex-1 maritime-btn-hero"
                      disabled={!mapboxToken.trim()}
                    >
                      Connect Map
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      asChild
                    >
                      <a 
                        href="https://mapbox.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Get Token</span>
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Route Legend */}
          {routes.length > 0 && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center space-x-2">
                <Route className="w-4 h-4 text-primary" />
                <span>Route Legend</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {routes.slice(0, 3).map((route, index) => (
                  <div 
                    key={route.id} 
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      selectedRoute?.id === route.id 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className={`w-4 h-1 rounded-full ${
                      index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-muted-foreground'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{route.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {route.distance.toLocaleString()} nm • {route.eta}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map Features Info */}
          <div className="mt-4 p-4 bg-info/5 border border-info/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-info mt-0.5" />
              <div>
                <h4 className="font-medium text-info mb-1">Interactive Map Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time weather overlay and sea conditions</li>
                  <li>• Port information and facility details</li>
                  <li>• Traffic density and congestion data</li>
                  <li>• Restricted zones and navigation warnings</li>
                  <li>• Fuel stations and emergency services locations</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapPlaceholder;