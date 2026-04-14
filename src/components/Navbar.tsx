import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Ship, 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  MapPin,
  BarChart3,
  Navigation
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-card border-b border-border shadow-wave sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Ship className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient-ocean">
              RouteOptimizer
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary transition-colors duration-200"
            >
              Home
            </Link>
            
            {user ? (
              <>
                {user.role === 'client' && (
                  <>
                    <Link 
                      to="/dashboard" 
                      className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors duration-200"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      to="/tracking" 
                      className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors duration-200"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Live Tracking</span>
                    </Link>
                  </>
                )}
                
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors duration-200"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/about" className="text-foreground hover:text-primary transition-colors duration-200">
                  About
                </Link>
                <Link to="/contact" className="text-foreground hover:text-primary transition-colors duration-200">
                  Contact
                </Link>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="maritime-btn-secondary">Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              
              {user ? (
                <>
                  {user.role === 'client' && (
                    <>
                      <Link 
                        to="/dashboard" 
                        className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors duration-200"
                        onClick={() => setIsOpen(false)}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                      <Link 
                        to="/tracking" 
                        className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors duration-200"
                        onClick={() => setIsOpen(false)}
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Live Tracking</span>
                      </Link>
                    </>
                  )}
                  
                  {user.role === 'admin' && (
                    <Link 
                      to="/admin" 
                      className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors duration-200"
                      onClick={() => setIsOpen(false)}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/about" className="text-foreground hover:text-primary transition-colors duration-200">
                    About
                  </Link>
                  <Link to="/contact" className="text-foreground hover:text-primary transition-colors duration-200">
                    Contact
                  </Link>
                  <div className="flex flex-col space-y-2 pt-2">
                    <Link to="/login">
                      <Button variant="ghost" className="w-full justify-start">Sign In</Button>
                    </Link>
                    <Link to="/register">
                      <Button className="w-full maritime-btn-secondary">Get Started</Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;