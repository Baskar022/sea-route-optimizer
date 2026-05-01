import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Ship, Target, Anchor } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  mockPortsByCountry,
  shipTypes,
  optimizationGoals,
  OptimizationMeta,
  OptimizationRequest,
  RouteOption,
} from "@/data/mockRoutes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface RoutePlannerProps {
  onRouteGenerated: (routes: RouteOption[]) => void;
  onMetaGenerated?: (meta: OptimizationMeta | undefined) => void;
}

const RoutePlanner = ({ onRouteGenerated, onMetaGenerated }: RoutePlannerProps) => {
  const [availablePorts, setAvailablePorts] = useState<Record<string, string[]>>(mockPortsByCountry);
  const [formData, setFormData] = useState<OptimizationRequest>({
    startPort: "",
    destinationPort: "",
    departureTime: "",
    shipType: "",
    optimizationGoal: "",
    speedKnots: 16,
    costPreference: 0.5,
  });
  const [date, setDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchOptimizerMetadata = async () => {
      try {
        const response = await fetch("/api/optimizer-metadata");
        if (!response.ok) return;

        const payload = await response.json();
        const backendPortOptions = payload?.meta?.portsByCountry;
        onMetaGenerated?.(payload?.meta);

        if (backendPortOptions && Object.keys(backendPortOptions).length > 0) {
          const normalizedPorts = Object.fromEntries(
            Object.entries(backendPortOptions).map(([country, ports]) => [
              country,
              (ports as { name: string }[]).map((port) => port.name),
            ])
          );

          if (Object.keys(normalizedPorts).length > 0) {
            setAvailablePorts(normalizedPorts);
            setFormData((prev) => {
              const allPorts = new Set(Object.values(normalizedPorts).flat());
              return {
                ...prev,
                startPort: allPorts.has(prev.startPort) ? prev.startPort : "",
                destinationPort: allPorts.has(prev.destinationPort) ? prev.destinationPort : "",
              };
            });
          }
        }
      } catch {
        // Keep fallback mock list when backend metadata is unavailable.
      }
    };

    fetchOptimizerMetadata();
  }, [onMetaGenerated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startPort || !formData.destinationPort || !formData.shipType || !formData.optimizationGoal || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.startPort === formData.destinationPort) {
      toast({
        title: "Invalid Route",
        description: "Start and destination ports must be different.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const requestWithDate = {
        ...formData,
        departureTime: format(date, "yyyy-MM-dd"),
        userId: user?.id,
      };

      const response = await fetch("/api/optimize-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestWithDate),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || "Failed to optimize route");
      }

      const payload = await response.json();
      const routes: RouteOption[] = (payload?.routes || []).map((route: RouteOption) => ({
        ...route,
        // Add port information for persistence
        startPort: formData.startPort,
        destinationPort: formData.destinationPort,
        ship_type: formData.shipType,
        optimization_goal: formData.optimizationGoal,
        departure_time: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
        waypoints:
          route.waypoints && route.waypoints.length > 0
            ? route.waypoints
            : (route.coords || []).map(([lng, lat], index, all) => ({
                name: index === 0 ? "Start" : index === all.length - 1 ? "Destination" : `WP-${index}`,
                lat,
                lng,
              })),
      }));

      // Check for routes crossing land
      const landCrossingRoutes = routes.filter(r => (r as any).landCrossing);
      if (landCrossingRoutes.length > 0) {
        toast({
          title: "Land Crossing Alert",
          description: `${landCrossingRoutes.length} route(s) cross land areas. Review carefully or use alternative routes.`,
          variant: "destructive",
        });
      }

      onRouteGenerated(routes);
      onMetaGenerated?.(payload?.meta);

      const backendPortOptions = payload?.meta?.portsByCountry;
      if (backendPortOptions && Object.keys(backendPortOptions).length > 0) {
        const normalizedPorts = Object.fromEntries(
          Object.entries(backendPortOptions).map(([country, ports]) => [
            country,
            (ports as { name: string }[]).map((port) => port.name),
          ])
        );

        if (Object.keys(normalizedPorts).length > 0) {
          setAvailablePorts(normalizedPorts);
        }
      }

      toast({
        title: "Routes Generated!",
        description: `Found ${routes.length} optimized routes for your voyage.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate routes. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      startPort: "",
      destinationPort: "",
      departureTime: "",
      shipType: "",
      optimizationGoal: "",
      speedKnots: 16,
      costPreference: 0.5,
    });
    setDate(undefined);
  };

  return (
    <Card className="maritime-card">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
            <Anchor className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle>Route Planner</CardTitle>
            <CardDescription>Plan your optimal maritime route with advanced algorithms</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startPort" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Start Port</span>
              </Label>
              <Select
                value={formData.startPort}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, startPort: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select departure port" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availablePorts).map(([country, ports], index) => (
                    <div key={country}>
                      <SelectGroup>
                        <SelectLabel>{country}</SelectLabel>
                        {ports.map((port) => (
                          <SelectItem key={port} value={port}>
                            {port}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      {index < Object.keys(availablePorts).length - 1 && <SelectSeparator />}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationPort" className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-secondary" />
                <span>Destination Port</span>
              </Label>
              <Select
                value={formData.destinationPort}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, destinationPort: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination port" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availablePorts).map(([country, ports], index) => (
                    <div key={country}>
                      <SelectGroup>
                        <SelectLabel>{country}</SelectLabel>
                        {ports.map((port) => (
                          <SelectItem key={port} value={port}>
                            {port}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      {index < Object.keys(availablePorts).length - 1 && <SelectSeparator />}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="speedKnots">Speed (knots)</Label>
              <Input
                id="speedKnots"
                type="number"
                min={8}
                max={30}
                step={0.5}
                value={formData.speedKnots ?? 16}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    speedKnots: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPreference">Cost Preference (0-1)</Label>
              <Input
                id="costPreference"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={formData.costPreference ?? 0.5}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    costPreference: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departure Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick departure date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(currentDate) => currentDate < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Ship className="w-4 h-4 text-accent" />
                <span>Ship Type</span>
              </Label>
              <Select
                value={formData.shipType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, shipType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel type" />
                </SelectTrigger>
                <SelectContent>
                  {shipTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Optimization Goal</Label>
              <Select
                value={formData.optimizationGoal}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, optimizationGoal: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select optimization" />
                </SelectTrigger>
                <SelectContent>
                  {optimizationGoals.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={loading} className="maritime-btn-hero flex-1">
              {loading ? "Calculating Routes..." : "Generate Routes"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} className="sm:w-auto">
              Reset
            </Button>
          </div>

          {loading && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Analyzing weather patterns, traffic data, and fuel costs...
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default RoutePlanner;
