import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Ship, 
  MapPin, 
  Clock, 
  DollarSign, 
  TrendingUp,
  History,
  BarChart3,
  Fuel,
  Route
} from "lucide-react";
import RoutePlanner from "@/components/RoutePlanner";
import RouteResults from "@/components/RouteResults";
import LeafletMap from "@/components/LeafletMap";
import { OptimizationMeta, RouteOption } from "@/data/mockRoutes";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ClientDashboard = () => {
  const [generatedRoutes, setGeneratedRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [optimizerMeta, setOptimizerMeta] = useState<OptimizationMeta | undefined>(undefined);
  const [routeHistory, setRouteHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVoyages: 0,
    costSavings: 0,
    fuelSaved: 0,
    avgRouteTime: 0
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRouteHistory();
      fetchStats();
    }
  }, [user]);

  const fetchRouteHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRouteHistory(data);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    const { data: routes } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', user.id);

    if (routes) {
      const asNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value || 0));
      const completed = routes.filter(r => r.status === 'completed' || r.status === 'planned');
      setStats({
        totalVoyages: routes.length,
        costSavings: completed.reduce((sum, r) => sum + asNumber((r as any).savings_inr), 0),
        fuelSaved: completed.reduce((sum, r) => sum + asNumber((r as any).fuel_saved_ton), 0),
        avgRouteTime: routes.length > 0 ? routes.reduce((sum, r) => sum + asNumber((r as any).travel_hours), 0) / routes.length : 0
      });
    }
  };

  const handleRouteGenerated = (routes: RouteOption[]) => {
    setGeneratedRoutes(routes);
    setSelectedRoute(null);
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    toast({
      title: "Route Selected",
      description: `${route.name} has been selected for your voyage planning.`,
    });
  };

  const quickStats = [
    {
      title: "Total Voyages",
      value: stats.totalVoyages.toString(),
      change: routeHistory.length > 0 ? `${routeHistory.length} planned` : "No voyages yet",
      icon: Ship,
      color: "text-primary"
    },
    {
      title: "Cost Savings",
      value: `₹${Math.round(stats.costSavings).toLocaleString('en-IN')}`,
      change: "Computed from stored route savings",
      icon: DollarSign,
      color: "text-success"
    },
    {
      title: "Fuel Saved",
      value: `${stats.fuelSaved.toFixed(1)}t`,
      change: "Computed from route baselines",
      icon: Fuel,
      color: "text-secondary"
    },
    {
      title: "Avg. Route Time",
      value: `${stats.avgRouteTime.toFixed(1)}h`,
      change: "Average of persisted route durations",
      icon: Clock,
      color: "text-accent"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-wave">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-ocean">
                Welcome back, {user?.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Plan and optimize your maritime routes with advanced AI algorithms
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-3 py-1">
                <Ship className="w-3 h-3 mr-1" />
                Client Account
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index} className="maritime-card hover:shadow-ocean transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted/30 ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="planner" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
            <TabsTrigger value="planner" className="flex items-center space-x-2">
              <Route className="w-4 h-4" />
              <span className="hidden sm:inline">Route Planner</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Results</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Map View</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Route Planner Tab */}
          <TabsContent value="planner" className="space-y-6">
            <RoutePlanner onRouteGenerated={handleRouteGenerated} onMetaGenerated={setOptimizerMeta} />
            {generatedRoutes.length > 0 && (
              <div className="animate-fade-in">
                <RouteResults 
                  routes={generatedRoutes} 
                  onRouteSelect={handleRouteSelect}
                />
              </div>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            {generatedRoutes.length > 0 ? (
              <div className="space-y-6">
                <RouteResults 
                  routes={generatedRoutes} 
                  onRouteSelect={handleRouteSelect}
                />
                
                {selectedRoute && (
                  <Card className="maritime-card animate-fade-in">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span>Selected Route: {selectedRoute.name}</span>
                      </CardTitle>
                      <CardDescription>
                        Route analysis and optimization recommendations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold">Route Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Distance:</span>
                              <span>{selectedRoute.distance.toLocaleString()} nm</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration:</span>
                              <span>{selectedRoute.eta}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fuel:</span>
                              <span>{selectedRoute.fuel}t</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-semibold">Cost Analysis</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Cost:</span>
                              <span className="font-medium">${selectedRoute.cost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fuel Cost:</span>
                              <span>${(selectedRoute.fuel * 650).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Port Fees:</span>
                              <span>${Math.floor(selectedRoute.cost * 0.15).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-semibold">Environmental Impact</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CO₂ Emissions:</span>
                              <span>{selectedRoute.carbonEmissions}t</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Efficiency:</span>
                              <span>{selectedRoute.fuelEfficiency}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="maritime-card">
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Route Analysis Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate routes using the Route Planner to see detailed analysis
                  </p>
                  <Button 
                    onClick={() => {
                      const plannerTab = document.querySelector('[value="planner"]') as HTMLButtonElement;
                      plannerTab?.click();
                    }}
                    className="maritime-btn-hero"
                  >
                    Start Planning Routes
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <Card className="maritime-card">
              <CardContent className="p-6">
                <LeafletMap 
                  routes={generatedRoutes} 
                  selectedRoute={selectedRoute}
                  constraints={optimizerMeta?.constraints}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="maritime-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-primary" />
                  <span>Voyage History</span>
                </CardTitle>
                <CardDescription>
                  Your recent maritime route optimizations and voyages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {routeHistory.length > 0 ? (
                    routeHistory.map((route) => (
                      <div 
                        key={route.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                            <Ship className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{route.origin} → {route.destination}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(route.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={route.status === 'completed' ? 'default' : 'secondary'}
                            className="mb-1"
                          >
                            {route.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {route.distance.toLocaleString()} nm
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ship className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No voyage history yet. Start planning routes to see them here.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;