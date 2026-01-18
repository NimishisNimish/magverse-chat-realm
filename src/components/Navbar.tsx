import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, History, MessageSquare, Settings, Shield, Crown, Activity, Zap, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import AdminNotifications from "@/components/AdminNotifications";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useCursor } from "@/contexts/CursorContext";
import { NotificationBadge } from "@/components/NotificationBadge";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import magverseLogo from "@/assets/magverse-ai-logo.png";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  let setCursorVariant: ((variant: string) => void) | undefined;
  
  try {
    const cursor = useCursor();
    setCursorVariant = cursor.setCursorVariant;
  } catch (e) {
    setCursorVariant = undefined;
  }
  
  const notifications = useNotificationBadge();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data);
    };

    checkAdminAccess();
  }, [user]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/chat", label: "Chat" },
    { href: "/models", label: "Models" },
    { href: "/support", label: "Support" },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const getMembershipBadge = () => {
    if (!profile) return null;
    
    if (profile.subscription_type === 'lifetime') {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border-0 cursor-pointer text-xs">
          <Crown className="w-3 h-3 mr-1" />
          Lifetime
        </Badge>
      );
    } else if (profile.subscription_type === 'monthly') {
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 border-0 cursor-pointer text-xs">
          <Zap className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      );
    }
    return null;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group shrink-0"
            onMouseEnter={() => setCursorVariant?.('link')}
            onMouseLeave={() => setCursorVariant?.('default')}
          >
            <img src={magverseLogo} alt="Magverse AI" className="w-8 h-8" />
            <span className="text-xl font-bold gradient-text hidden sm:block">Magverse AI</span>
          </Link>
          
          {/* Center Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                to={link.href} 
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  isActiveLink(link.href)
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {isAdmin && user && <AdminNotifications />}
            
            {user ? (
              <>
                {/* Membership badge with notification */}
                <div className="relative hidden sm:block">
                  {getMembershipBadge()}
                  {notifications.creditsAdded > 0 && (
                    <div className="absolute -top-2 -right-2">
                      <NotificationBadge count={notifications.creditsAdded} variant="credits" />
                    </div>
                  )}
                </div>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 px-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10">
                          {profile?.username?.[0]?.toUpperCase() || 
                           profile?.display_name?.[0]?.toUpperCase() || 
                           user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline text-sm max-w-[100px] truncate">
                        {profile?.display_name || profile?.username || user.email?.split('@')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {profile?.display_name || profile?.username || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/chat" className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/history" className="cursor-pointer">
                        <History className="w-4 h-4 mr-2" />
                        History
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/activity" className="cursor-pointer">
                            <Activity className="w-4 h-4 mr-2" />
                            User Activity
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Login
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/40">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActiveLink(link.href)
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
