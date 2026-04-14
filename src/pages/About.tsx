import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Ship, 
  Target, 
  Shield, 
  TrendingUp, 
  Users, 
  Globe,
  Zap,
  Award,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  const features = [
    {
      icon: Target,
      title: "AI-Powered Optimization",
      description: "Advanced machine learning algorithms analyze weather patterns, traffic data, and fuel costs to find the most efficient routes."
    },
    {
      icon: Shield,
      title: "Safety First",
      description: "Real-time risk assessment considers piracy zones, weather conditions, and maritime regulations for maximum voyage safety."
    },
    {
      icon: TrendingUp,
      title: "Cost Reduction",
      description: "Reduce fuel costs by up to 15% and save thousands on port fees with our intelligent route planning system."
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Dynamic route adjustments based on live weather data, port congestion, and maritime traffic conditions."
    }
  ];

  const stats = [
    { label: "Routes Optimized", value: "50K+", icon: Ship },
    { label: "Fuel Saved", value: "2.3M tons", icon: Target },
    { label: "Cost Savings", value: "₹1.49L Cr", icon: TrendingUp },
    { label: "Active Users", value: "10K+", icon: Users }
  ];

  const team = [
    {
      name: "Captain Mohit Nirmal",
      role: "Founder & CEO", 
      description: "Maritime technology visionary with 20+ years in Indian shipping industry"
    },
    {
      name: "Ray Prashant",
      role: "CTO & AI Research Lead",
      description: "Former IIT researcher specializing in maritime AI and route optimization"
    },
    {
      name: "Baskar Pillai",
      role: "VP of Operations",
      description: "Expert in Indian Ocean shipping routes with 15+ years at major shipping lines"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <div className="hero-gradient text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 mb-6">
              <Award className="w-3 h-3 mr-1" />
              Industry Leading Solution
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Revolutionizing
              <span className="block text-secondary">Maritime Navigation</span>
            </h1>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto">
              We combine decades of maritime expertise with cutting-edge AI to deliver 
              the world's most advanced ship route optimization platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button className="maritime-btn-hero">
                  Start Your Journey
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Features Section */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose RouteOptimizer?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform combines real-time data, advanced algorithms, and maritime expertise 
              to deliver unmatched route optimization capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="maritime-card hover:shadow-ocean transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by the Industry
            </h2>
            <p className="text-xl text-muted-foreground">
              See the impact we've made across the global maritime industry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="maritime-card text-center">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
                      <stat.icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gradient-ocean mb-2">{stat.value}</h3>
                  <p className="text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Meet Our Expert Team
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our diverse team of maritime professionals, AI researchers, and product experts 
              work together to push the boundaries of route optimization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="maritime-card text-center">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Mission Section */}
        <Card className="maritime-card">
          <CardContent className="p-12 text-center">
            <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto mb-8">
              To revolutionize global maritime transportation by providing intelligent, 
              sustainable, and cost-effective route optimization solutions that benefit 
              both businesses and the environment. We believe that smarter navigation 
              leads to a cleaner ocean and a more efficient world.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Sustainable Operations</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Cost Optimization</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Global Impact</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;