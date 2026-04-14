import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Ship, 
  BarChart3, 
  Settings, 
  TrendingUp,
  MapPin,
  Shield,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeUsers] = useState(127);
  const [totalVoyages] = useState(1540);
  const [systemHealth] = useState(98.5);

  const adminStats = [
    {
      title: "Active Users",
      value: activeUsers.toString(),
      change: "+12 new this week",
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Total Voyages",
      value: totalVoyages.toLocaleString(),
      change: "+89 this month",
      icon: Ship,
      color: "text-secondary"
    },
    {
      title: "System Health",
      value: `${systemHealth}%`,
      change: "All systems operational",
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "Cost Savings",
      value: "$2.4M",
      change: "+15% vs last quarter",
      icon: TrendingUp,
      color: "text-accent"
    }
  ];

  const recentUsers = [
    { id: 1, name: "John Smith", email: "j.smith@maritime.com", role: "Client", status: "Active", joined: "2 days ago" },
    { id: 2, name: "Sarah Chen", email: "s.chen@shipping.co", role: "Client", status: "Active", joined: "1 week ago" },
    { id: 3, name: "Mike Johnson", email: "m.johnson@logistics.net", role: "Client", status: "Pending", joined: "3 days ago" },
  ];

  const systemAlerts = [
    { type: "info", message: "Scheduled maintenance on Sunday 2:00 AM UTC", time: "2 hours ago" },
    { type: "warning", message: "High API usage detected for user #1247", time: "6 hours ago" },
    { type: "success", message: "New optimization algorithm deployed successfully", time: "1 day ago" },
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      default: return <Shield className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-wave">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-ocean">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage users, vessels, and system configurations
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-3 py-1">
                <Shield className="w-3 h-3 mr-1" />
                Administrator
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminStats.map((stat, index) => (
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

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="vessels" className="flex items-center space-x-2">
              <Ship className="w-4 h-4" />
              <span className="hidden sm:inline">Vessels</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">User Management</h2>
              <Button className="maritime-btn-hero">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <Card className="maritime-card">
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>
                  Latest user registrations and account status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <Badge 
                            variant={user.status === 'Active' ? 'default' : 'secondary'}
                            className="mb-1"
                          >
                            {user.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{user.joined}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vessel Management */}
          <TabsContent value="vessels">
            <Card className="maritime-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vessel Database</CardTitle>
                    <CardDescription>
                      Manage ship types, fuel curves, and vessel specifications
                    </CardDescription>
                  </div>
                  <Button className="maritime-btn-hero">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vessel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Ship className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Vessel Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure vessel types, fuel consumption curves, and operational parameters
                  </p>
                  <Button className="maritime-btn-secondary">
                    Configure Vessels
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <Card className="maritime-card">
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
                <CardDescription>
                  Performance metrics and usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Route Optimization Stats</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Routes Generated:</span>
                        <span className="font-medium">4,627</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. Fuel Savings:</span>
                        <span className="font-medium text-success">12.4%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. Time Reduction:</span>
                        <span className="font-medium text-primary">8.7%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">System Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">API Response Time:</span>
                        <span className="font-medium">145ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="font-medium text-success">99.9%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Sessions:</span>
                        <span className="font-medium">342</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="maritime-card">
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>
                    Global system settings and parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Maintenance Mode</span>
                      <Badge variant="outline">Disabled</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Auto-scaling</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Debug Logging</span>
                      <Badge variant="secondary">Production</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="maritime-card">
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                  <CardDescription>
                    Recent system notifications and warnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemAlerts.map((alert, index) => (
                      <div 
                        key={index}
                        className="flex items-start space-x-3 p-3 rounded-lg border border-border"
                      >
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;