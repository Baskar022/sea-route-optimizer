export interface RouteOption {
  id: string;
  name: string;
  distance: number; // nautical miles
  eta: string;
  fuel: number; // tons
  cost: number; // INR
  risk: 'Low' | 'Medium' | 'High';
  coords: [number, number][]; // [longitude, latitude] pairs
  waypoints?: { name: string; lat: number; lng: number }[];
  weather: string;
  piracyRisk: string;
  fuelEfficiency: number;
  carbonEmissions: number;
  score?: number;
  scoringBreakdown?: Record<string, number>;
}

export interface OptimizationRequest {
  startPort: string;
  destinationPort: string;
  departureTime: string;
  shipType: string;
  optimizationGoal: string;
  speedKnots?: number;
  costPreference?: number;
  userId?: string;
}

export interface ZoneConstraint {
  id?: string;
  name: string;
  category?: "traffic" | "weather" | "piracy" | "danger";
  riskLevel: "Low" | "Medium" | "High";
  center: [number, number];
  radiusNm: number;
}

export interface OptimizationMeta {
  algorithm?: string;
  format?: string;
  portsByCountry?: Record<string, { name: string; lat: number; lng: number }[]>;
  constraints?: {
    trafficZones?: ZoneConstraint[];
    weatherZones?: ZoneConstraint[];
    piracyZones?: ZoneConstraint[];
    dangerZones?: ZoneConstraint[];
  };
}

export const mockPortsByCountry: Record<string, string[]> = {
  India: [
    "Mumbai, India",
    "Kolkata, India",
    "Chennai, India",
    "Kochi, India",
    "Visakhapatnam, India",
    "Mormugao, India",
  ],
  Singapore: ["Singapore"],
  UAE: ["Dubai, UAE", "Abu Dhabi, UAE"],
  China: ["Shanghai, China", "Shenzhen, China", "Qingdao, China"],
  Netherlands: ["Rotterdam, Netherlands"],
  Germany: ["Hamburg, Germany"],
  Oman: ["Muscat, Oman"],
  Egypt: ["Alexandria, Egypt"],
  Kenya: ["Mombasa, Kenya"],
  "South Africa": ["Cape Town, South Africa"],
};

export const mockPorts = Object.values(mockPortsByCountry).flat();

export const shipTypes = [
  "Container Ship",
  "Bulk Carrier", 
  "Tanker",
  "General Cargo",
  "RoRo Vessel"
];

export const optimizationGoals = [
  "Fastest Route",
  "Most Fuel Efficient", 
  "Lowest Cost",
  "Safest Route",
  "Balanced Optimization"
];

// Mock route generation based on request
export const generateMockRoutes = (request: OptimizationRequest): RouteOption[] => {
  const baseDistance = Math.floor(Math.random() * 5000) + 2000;
  
  return [
    {
      id: "route-1",
      name: "Fastest Route",
      distance: baseDistance,
      eta: "72h 30m",
      fuel: Math.floor(baseDistance * 0.03),
      cost: Math.floor((baseDistance * 2.5 + Math.floor(Math.random() * 1000)) * 83), // Convert to INR (~83 INR per USD)
      risk: "Medium",
      coords: [
        [121.4737, 31.2304], // Shanghai
        [118.2437, 24.4539], // Taiwan Strait
        [103.8198, 1.3521],  // Singapore
        [4.4699, 51.9244]    // Rotterdam
      ],
      weather: "Favorable winds, calm seas",
      piracyRisk: "Low in most areas, medium near Malacca Strait",
      fuelEfficiency: 85,
      carbonEmissions: Math.floor(baseDistance * 0.025)
    },
    {
      id: "route-2", 
      name: "Fuel-Efficient Route",
      distance: baseDistance + 200,
      eta: "78h 15m",
      fuel: Math.floor(baseDistance * 0.025),
      cost: Math.floor((baseDistance * 2.2 + Math.floor(Math.random() * 800)) * 83), // Convert to INR
      risk: "Low",
      coords: [
        [121.4737, 31.2304], // Shanghai
        [120.9605, 23.6978], // Taiwan
        [114.1095, 22.3964], // Hong Kong
        [103.8198, 1.3521],  // Singapore  
        [4.4699, 51.9244]    // Rotterdam
      ],
      weather: "Moderate winds, slight waves",
      piracyRisk: "Low throughout route",
      fuelEfficiency: 92,
      carbonEmissions: Math.floor(baseDistance * 0.02)
    },
    {
      id: "route-3",
      name: "Safest Route", 
      distance: baseDistance + 400,
      eta: "84h 45m",
      fuel: Math.floor(baseDistance * 0.032),
      cost: Math.floor((baseDistance * 2.8 + Math.floor(Math.random() * 1200)) * 83), // Convert to INR
      risk: "Low",
      coords: [
        [121.4737, 31.2304], // Shanghai
        [139.6917, 35.6895], // Tokyo Bay
        [119.5208, 23.5509], // Taiwan  
        [103.8198, 1.3521],  // Singapore
        [55.2708, 25.2048],  // Dubai
        [4.4699, 51.9244]    // Rotterdam
      ],
      weather: "Excellent conditions throughout",
      piracyRisk: "Very low - international shipping lanes",
      fuelEfficiency: 78,
      carbonEmissions: Math.floor(baseDistance * 0.028)
    }
  ];
};

export const mockVoyageHistory = [
  {
    id: "voyage-1",
    route: "Mumbai → Singapore", 
    date: "2024-01-15",
    status: "Completed",
    savings: "₹10,37,500",
    duration: "74h 20m"
  },
  {
    id: "voyage-2", 
    route: "Chennai → Dubai",
    date: "2024-01-08", 
    status: "Completed",
    savings: "₹7,26,250",
    duration: "168h 45m"
  },
  {
    id: "voyage-3",
    route: "Kochi → Shanghai",
    date: "2024-01-02",
    status: "In Progress", 
    savings: "TBD",
    duration: "Est. 240h"
  }
];