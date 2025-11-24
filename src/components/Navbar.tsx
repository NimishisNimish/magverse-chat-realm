import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Zap, User, History, MessageSquare, Settings, LayoutDashboard, BarChart3, Shield, Crown, Users, Activity, DollarSign, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
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
import magverseLogo from "@/assets/magverse-logo.png";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Try to use cursor context if available, but don't fail if it's not
  let setCursorVariant: ((variant: string) => void) | undefined;
  
  try {
    const cursor = useCursor();
    setCursorVariant = cursor.setCursorVariant;
  } catch (e) {
    // CursorProvider not available - that's ok, cursor effects are optional
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

  const getMembershipBadge = () => {
    if (!profile) return null;
    
    if (profile.subscription_type === 'lifetime') {
      return (
        <Link to="/dashboard">
          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border-0 cursor-pointer">
            <Crown className="w-3 h-3 mr-1" />
            Lifetime Pro
          </Badge>
        </Link>
      );
    } else if (profile.subscription_type === 'monthly') {
      return (
        <Link to="/dashboard">
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 border-0 cursor-pointer">
            <Zap className="w-3 h-3 mr-1" />
            Pro Yearly
          </Badge>
        </Link>
      );
    } else {
      return (
        <Link to="/dashboard">
          <Badge variant="outline" className="border-muted-foreground/30 hover:bg-accent/10 cursor-pointer">
            <User className="w-3 h-3 mr-1" />
            Free Plan
          </Badge>
        </Link>
      );
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-glass-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2 group"
          onMouseEnter={() => setCursorVariant?.('link')}
          onMouseLeave={() => setCursorVariant?.('default')}
        >
          <img src={magverseLogo} alt="Magverse AI" className="w-10 h-10" />
          <span className="text-2xl font-bold gradient-text">Magverse AI</span>
        </Link>
        
      <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <Link to="/pricing" className="text-foreground hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link to="/support" className="text-foreground hover:text-primary transition-colors">
              Support
            </Link>
          </div>
        
        <ThemeToggle />
        <ThemeCustomizer />
        
        {isAdmin && user && <AdminNotifications />}
        
        {user ? (
            <>
              <div className="relative">
                {getMembershipBadge()}
                {notifications.creditsAdded > 0 && (
                  <div className="absolute -top-2 -right-2">
                    <NotificationBadge 
                      count={notifications.creditsAdded} 
                      variant="credits"
                    />
                  </div>
                )}
                {notifications.subscriptionUpdate && (
                  <div className="absolute -top-2 -right-2">
                    <NotificationBadge 
                      count={1} 
                      variant="subscription"
                    />
                  </div>
                )}
              </div>
              <Link to="/chat">
                <Button variant="ghost" className="text-foreground">
                  Chat
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-accent/30 flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile?.username?.[0]?.toUpperCase() || 
                         profile?.display_name?.[0]?.toUpperCase() || 
                         user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline">
                      {profile?.display_name || profile?.username || user.email?.substring(0, 20)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {profile?.display_name || profile?.username || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                      {profile?.username && (
                        <span className="text-xs text-muted-foreground font-normal">@{profile.username}</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/model-status" className="w-full cursor-pointer">
                <Activity className="mr-2 h-4 w-4" />
                Model Status
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/model-metrics" className="w-full cursor-pointer">
                <TrendingUp className="mr-2 h-4 w-4" />
                Performance Metrics
                {profile?.subscription_type !== 'free' && (
                  <Crown className="ml-auto w-3 h-3 text-amber-500" />
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Profile Settings
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
                        <Link to="/admin/analytics" className="cursor-pointer">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analytics
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/users" className="cursor-pointer">
                          <Users className="w-4 h-4 mr-2" />
                          User Management
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/activity" className="cursor-pointer">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          User Activity
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/model-status" className="cursor-pointer">
                      <Activity className="w-4 h-4 mr-2" />
                      Model Status
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/cost-tracking" className="cursor-pointer">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Cost Tracking
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="border-accent/30 text-foreground hover:bg-accent/10">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
