import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Ship, 
  MapPin, 
  Clock, 
  DollarSign, 
  TrendingUp,
  History,
  BarChart3,
  Fuel,
  Route,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Info,
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
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [selectedHistoryRoute, setSelectedHistoryRoute] = useState<any>(null);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [routeMapData, setRouteMapData] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPlanned: 0,
    totalCompleted: 0,
    totalCancelled: 0,
    totalCostSavingsInr: 0,
    totalFuelSavedTon: 0,
    avgEfficiencyScore: 0,
    activeVoyages: 0,
    allVoyages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch voyage metrics
  const fetchVoyageMetrics = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/voyages/metrics/${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");

      const { metrics } = await response.json();
      setStats(metrics);
    } catch (error) {
      console.error("Error fetching voyage metrics:", error);
    }
  }, [user?.id]);

  // Fetch route history
  const fetchRouteHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setRouteHistory(data || []);
    } catch (error) {
      console.error('Error fetching route history:', error);
    }
  }, [user?.id]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const setupSubscription = () => {
      // Subscribe to routes changes for this user
      subscriptionRef.current = supabase
        .channel(`routes:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'routes',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Refresh both history and metrics when routes change
            fetchRouteHistory();
            fetchVoyageMetrics();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, fetchRouteHistory, fetchVoyageMetrics]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadingMetrics(true);
      
      await Promise.all([fetchRouteHistory(), fetchVoyageMetrics()]);
      
      setLoading(false);
      setLoadingMetrics(false);
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id, fetchRouteHistory, fetchVoyageMetrics]);

  const handleRouteGenerated = (routes: RouteOption[]) => {
    setGeneratedRoutes(routes);
    setSelectedRoute(null);
    // Refresh metrics and history after new routes are generated
    setTimeout(() => {
      fetchRouteHistory();
      fetchVoyageMetrics();
    }, 1000);
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    toast({
      title: "Route Selected",
      description: `${route.name} has been selected for your voyage planning.`,
    });
  };

  const handleStartVoyage = async (routeId: string) => {
    try {
      // First, get the full route details to display on map
      const routeToStart = routeHistory.find(r => r.id === routeId);
      if (!routeToStart) {
        throw new Error('Route not found');
      }

      // Show route on map before starting
      setRouteMapData(routeToStart);
      setShowRouteMap(true);

      // Start the voyage in background
      const response = await fetch(`/api/voyages/start/${routeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to start voyage');

      const { message } = await response.json();
      toast({
        title: "Voyage Started",
        description: message,
      });

      // Metrics will auto-update via real-time subscription
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start voyage",
        variant: "destructive",
      });
    }
  };

  const handleCompleteVoyage = async (routeId: string) => {
    try {
      const response = await fetch(`/api/voyages/complete/${routeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to complete voyage');

      const { message } = await response.json();
      toast({
        title: "Voyage Completed",
        description: message,
      });

      // Metrics will auto-update via real-time subscription
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete voyage",
        variant: "destructive",
      });
    }
  };

  const handleCancelVoyage = async (routeId: string) => {
    try {
      const response = await fetch(`/api/voyages/cancel/${routeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to cancel voyage');

      const { message } = await response.json();
      toast({
        title: "Voyage Cancelled",
        description: message,
      });

      // Metrics will auto-update via real-time subscription
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel voyage",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setLoadingMetrics(true);
    await Promise.all([fetchRouteHistory(), fetchVoyageMetrics()]);
    setLoadingMetrics(false);
    toast({
      title: "Refreshed",
      description: "Dashboard metrics updated",
    });
  };

  const handleShowRouteDetails = (route: any) => {
    setSelectedHistoryRoute(route);
    setShowRouteDetails(true);
    // Also set map data so user can view on map
    setRouteMapData(route);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'active':
        return <Play className="w-4 h-4 text-accent" />;
      case 'planned':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'active':
        return 'secondary';
      case 'planned':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const quickStats = [
    {
      title: "Total Voyages",
      value: stats.allVoyages.toString(),
      change: `${stats.activeVoyages} planned • ${stats.totalCompleted} completed`,
      icon: Ship,
      color: "text-primary"
    },
    {
      title: "Cost Savings (Cumulative)",
      value: `₹${Math.round(stats.totalCostSavingsInr).toLocaleString('en-IN')}`,
      change: "Total across all completed voyages",
      icon: DollarSign,
      color: "text-success"
    },
    {
      title: "Fuel Saved (Cumulative)",
      value: `${stats.totalFuelSavedTon.toFixed(1)}t`,
      change: "Total across all completed voyages",
      icon: Fuel,
      color: "text-secondary"
    },
    {
      title: "Avg. Efficiency Score",
      value: `${stats.avgEfficiencyScore.toFixed(1)}/10`,
      change: "Average route optimization score",
      icon: TrendingUp,
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingMetrics}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loadingMetrics ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
                            {getStatusIcon(route.status)}
                          </div>
                          <div>
                            <h4 className="font-medium">{route.origin} → {route.destination}</h4>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-sm text-muted-foreground">
                                {new Date(route.created_at).toLocaleDateString()}
                              </p>
                              <Badge 
                                variant={getStatusBadge(route.status) as any}
                                className="text-xs"
                              >
                                {route.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {route.distance.toLocaleString()} nm
                            </p>
                            {route.savings_inr && (
                              <p className="text-xs text-success">
                                ₹{Math.round(route.savings_inr).toLocaleString('en-IN')} saved
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShowRouteDetails(route)}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <Info className="w-3 h-3" />
                            </Button>
                            {route.status === 'planned' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartVoyage(route.id)}
                                  className="flex items-center space-x-1"
                                >
                                  <Play className="w-3 h-3" />
                                  <span className="hidden sm:inline">Start</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelVoyage(route.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {route.status === 'active' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCompleteVoyage(route.id)}
                                  className="flex items-center space-x-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="hidden sm:inline">Complete</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelVoyage(route.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {route.status === 'completed' && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                            {route.status === 'cancelled' && (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancelled
                              </Badge>
                            )}
                          </div>
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

      {/* Route Details Modal */}
      <Dialog open={showRouteDetails} onOpenChange={setShowRouteDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Route Details</span>
            </DialogTitle>
            <DialogDescription>
              {selectedHistoryRoute?.origin} → {selectedHistoryRoute?.destination}
            </DialogDescription>
          </DialogHeader>

          {selectedHistoryRoute && (
            <div className="space-y-6">
              {/* Route Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-lg font-semibold">{selectedHistoryRoute.distance?.toLocaleString()} nm</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-semibold">{selectedHistoryRoute.travel_hours?.toFixed(1) || 'N/A'}h</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selectedHistoryRoute.status === 'completed' ? 'default' : 'secondary'} className="mt-1">
                    {selectedHistoryRoute.status}
                  </Badge>
                </div>
              </div>

              {/* Costs & Resources */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Costs & Resources</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Route Cost:</span>
                    <span className="font-medium">₹{Math.round(selectedHistoryRoute.route_cost_inr || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Baseline Cost:</span>
                    <span>₹{Math.round(selectedHistoryRoute.baseline_cost_inr || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fuel Consumption:</span>
                    <span className="font-medium">{selectedHistoryRoute.fuel_consumption?.toFixed(1) || 0}t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fuel Saved:</span>
                    <span className="text-success font-medium">{selectedHistoryRoute.fuel_saved_ton?.toFixed(1) || 0}t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost Savings:</span>
                    <span className="text-success font-medium">₹{Math.round(selectedHistoryRoute.savings_inr || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Optimization Score:</span>
                    <span className="font-medium">{selectedHistoryRoute.optimization_score?.toFixed(1) || 0}/10</span>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Risk Assessment</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Level:</span>
                    <Badge variant={selectedHistoryRoute.risk_level === 'Low' ? 'outline' : selectedHistoryRoute.risk_level === 'Medium' ? 'secondary' : 'destructive'}>
                      {selectedHistoryRoute.risk_level || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weather Conditions:</span>
                    <span>{selectedHistoryRoute.weather_conditions || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Route Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Route Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ship Type:</span>
                    <span>{selectedHistoryRoute.ship_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Optimization Goal:</span>
                    <span>{selectedHistoryRoute.optimization_goal || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departure Date:</span>
                    <span>{new Date(selectedHistoryRoute.departure_time || 0).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(selectedHistoryRoute.created_at || 0).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={() => setShowRouteMap(true)}
                  className="flex-1"
                  variant="outline"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Route Map Viewer Dialog */}
      <Dialog open={showRouteMap} onOpenChange={setShowRouteMap}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>
                {routeMapData?.startPort} → {routeMapData?.destinationPort}
              </span>
            </DialogTitle>
            <DialogDescription>
              {routeMapData?.optimization_goal || 'Route Visualization'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-96 border rounded-md overflow-hidden">
            {routeMapData && (
              <LeafletMap
                routes={[routeMapData]}
                selectedRoute={routeMapData}
                activeRoute={routeMapData}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance:</span>
              <span className="font-semibold">{routeMapData?.distance} NM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Time:</span>
              <span className="font-semibold">{routeMapData?.travel_hours} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fuel Cost:</span>
              <span className="font-semibold">₹{Math.round(routeMapData?.route_cost_inr || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk Level:</span>
              <Badge className={
                routeMapData?.risk_level === 'Low' ? 'route-status-safe' :
                routeMapData?.risk_level === 'Medium' ? 'route-status-medium' :
                'route-status-high'
              }>
                {routeMapData?.risk_level}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;