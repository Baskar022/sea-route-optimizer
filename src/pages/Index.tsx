import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Ship, 
  MapPin, 
  TrendingUp, 
  Shield, 
  Zap,
  Target,
  Users,
  Star,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const features = [
    {
      icon: Target,
      title: "AI-Powered Routes",
      description: "Advanced algorithms analyze weather, traffic, and costs to find optimal paths"
    },
    {
      icon: Shield, 
      title: "Safety Guaranteed",
      description: "Real-time risk assessment for piracy zones and weather conditions"
    },
    {
      icon: TrendingUp,
      title: "Cost Optimization", 
      description: "Reduce fuel costs by up to 15% with intelligent route planning"
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Dynamic adjustments based on live maritime data and conditions"
    }
  ];

  const testimonials = [
    {
      name: "Captain Mohit Nirmal",
      company: "IndiaShip Maritime Ltd.",
      text: "RouteOptimizer has revolutionized our operations. We've saved over ₹1.66 crores in fuel costs this year alone.",
      rating: 5
    },
    {
      name: "Baskar Pillai", 
      company: "Tata Maritime Solutions",
      text: "The AI predictions are incredibly accurate. Our delivery times have improved by 12% consistently.",
      rating: 5
    },
    {
      name: "Siddhi Saxena",
      company: "Reliance Shipping Co.",
      text: "Best investment we've made. The safety features alone have prevented multiple costly incidents.",
      rating: 5
    }
  ];

  const stats = [
    { value: "50K+", label: "Routes Optimized" },
    { value: "2.3M", label: "Tons Fuel Saved" },
    { value: "₹1.49L Cr", label: "Cost Savings" },
    { value: "10K+", label: "Active Users" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient text-primary-foreground overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 mb-6 animate-fade-in">
              <Ship className="w-3 h-3 mr-1" />
              Next-Gen Maritime Technology
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 animate-fade-in">
              Optimize Your
              <span className="block text-secondary animate-wave">Maritime Routes</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-10 max-w-4xl mx-auto animate-fade-in">
              Harness the power of AI to plan the most efficient, safe, and cost-effective 
              routes for your maritime operations. Save fuel, reduce costs, and arrive faster.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in">
              <Link to="/register">
                <Button className="maritime-btn-hero text-lg px-8 py-4 hover:scale-105 transition-transform">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button 
                  variant="secondary" 
                  className="text-lg px-8 py-4"
                >
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 pt-8 border-t border-primary-foreground/20">
              <p className="text-primary-foreground/70 mb-6">Trusted by industry leaders worldwide</p>
              <div className="flex justify-center items-center space-x-8 opacity-70">
                {['Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd'].map((company, index) => (
                  <div key={index} className="text-primary-foreground/60 font-semibold text-lg">
                    {company}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 opacity-20 animate-float">
          <Ship className="w-16 h-16 text-primary-foreground" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20 animate-float" style={{ animationDelay: '2s' }}>
          <MapPin className="w-12 h-12 text-secondary" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-gradient-ocean mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-background to-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Revolutionary Maritime Intelligence
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our advanced AI platform combines real-time data, machine learning, 
              and maritime expertise to deliver unparalleled route optimization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="maritime-card hover:shadow-ocean transition-all duration-500 hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl shadow-wave">
                      <feature.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                      <p className="text-muted-foreground text-lg leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              What Our Customers Say
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of maritime professionals who trust RouteOptimizer 
              for their critical operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="maritime-card">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-warning fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <div>
                    <div className="font-semibold text-lg">{testimonial.name}</div>
                    <div className="text-muted-foreground">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 ocean-gradient text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to Optimize Your Fleet?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-10 leading-relaxed">
            Join the maritime revolution and start saving fuel, reducing costs, 
            and improving safety with our AI-powered route optimization platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link to="/register">
              <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-4 font-semibold">
                Start Your Free Trial
              </Button>
            </Link>
            <Link to="/contact">
              <Button 
                variant="secondary" 
                className="text-lg px-8 py-4"
              >
                Contact Sales
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm opacity-90">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>24/7 support included</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
