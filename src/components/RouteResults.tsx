import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Clock, 
  IndianRupee, 
  Fuel, 
  MapPin, 
  Shield, 
  TrendingUp,
  Eye,
  Rocket,
  AlertTriangle,
  Info,
  Loader2
} from "lucide-react";
import { RouteOption } from "@/data/mockRoutes";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface RouteResultsProps {
  routes: RouteOption[];
  onRouteSelect: (route: RouteOption) => void;
}

const RouteResults = ({ routes, onRouteSelect }: RouteResultsProps) => {
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [savingRoute, setSavingRoute] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'Low':
        return <Shield className="w-4 h-4 text-success" />;
      case 'Medium':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'High':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'Low':
        return 'route-status-safe';
      case 'Medium':
        return 'route-status-medium';
      case 'High':
        return 'route-status-high';
      default:
        return '';
    }
  };

  const handleRouteDetails = (route: RouteOption) => {
    setSelectedRoute(route);
    setShowDetails(true);
  };

  const handleSaveAndStart = async (route: RouteOption) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated. Please log in to save routes.",
        variant: "destructive",
      });
      return;
    }

    setSavingRoute(route.id);

    try {
      const response = await fetch("/api/save-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: {
            ...route,
            status: "planned",
          },
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save route");
      }

      const { message } = await response.json();
      toast({
        title: "Success",
        description: message || "Route saved and ready to start your voyage!",
      });

      onRouteSelect?.(route);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save route",
        variant: "destructive",
      });
    } finally {
      setSavingRoute(null);
    }
  };

  if (!routes.length) {
    return (
      <Card className="maritime-card">
        <CardContent className="text-center py-8">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Routes Generated</h3>
          <p className="text-muted-foreground">
            Use the route planner to generate optimized maritime routes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="maritime-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>Route Options</span>
          </CardTitle>
          <CardDescription>
            Comparing {routes.length} optimized routes for your voyage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span>{route.name}</span>
                        {(route as any).landCrossing && (
                          <Badge variant="destructive" className="text-xs">
                            ⚠ Land Crossing
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{route.distance.toLocaleString()} nm</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{route.eta}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Fuel className="w-3 h-3 text-muted-foreground" />
                        <span>{route.fuel}t</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <IndianRupee className="w-3 h-3 text-muted-foreground" />
                        <span>₹{route.cost.toLocaleString('en-IN')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("flex items-center space-x-1", getRiskBadgeClass(route.risk))}>
                        {getRiskIcon(route.risk)}
                        <span>{route.risk}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRouteDetails(route)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveAndStart(route)}
                          disabled={savingRoute === route.id}
                          className="maritime-btn-secondary"
                        >
                          {savingRoute === route.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Rocket className="w-3 h-3 mr-1" />
                          )}
                          {savingRoute === route.id ? "Saving..." : "Save & Start"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Best Route Recommendation */}
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-semibold text-primary mb-2 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Recommended Route</span>
            </h4>
            <p className="text-sm text-muted-foreground">
              Based on your optimization preferences, we recommend the <strong>{routes[0]?.name}</strong> 
              {" "}for the best balance of cost, time, and safety.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Route Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>{selectedRoute?.name} - Detailed Analysis</span>
            </DialogTitle>
            <DialogDescription>
              Complete route information and recommendations
            </DialogDescription>
          </DialogHeader>
          
          {selectedRoute && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="font-semibold">{selectedRoute.distance.toLocaleString()} nm</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Clock className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">{selectedRoute.eta}</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Fuel className="w-5 h-5 text-secondary mx-auto mb-1" />
                  <p className="text-sm text-muted-foreground">Fuel</p>
                  <p className="font-semibold">{selectedRoute.fuel}t</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="font-semibold">₹{selectedRoute.cost.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Weather Conditions</h4>
                  <p className="text-sm text-muted-foreground">{selectedRoute.weather}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Security Assessment</h4>
                  <p className="text-sm text-muted-foreground">{selectedRoute.piracyRisk}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Fuel Efficiency</h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${selectedRoute.fuelEfficiency}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedRoute.fuelEfficiency}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Carbon Emissions</h4>
                    <p className="text-sm text-muted-foreground">{selectedRoute.carbonEmissions}t CO₂</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    handleSelectRoute(selectedRoute);
                    setShowDetails(false);
                  }}
                  className="maritime-btn-hero"
                >
                  Select This Route
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default RouteResults;