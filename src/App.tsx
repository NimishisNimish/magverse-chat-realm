import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CursorProvider } from "@/contexts/CursorContext";
import CustomCursor from "@/components/CustomCursor";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useUnifiedNotifications } from "@/hooks/useUnifiedNotifications";
import AdminInsights from "./pages/AdminInsights";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Upgrade from "./pages/Upgrade";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import History from "./pages/History";
import ResetPassword from "./pages/ResetPassword";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import LinkPhone from "./pages/LinkPhone";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ProfileSettings from "./pages/ProfileSettings";
import Admin from "./pages/Admin";
import Payment from "./pages/Payment";
import Dashboard from "./pages/Dashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import UserManagement from "./pages/UserManagement";
import Support from "./pages/Support";
import ImageGallery from "./pages/ImageGallery";
import AdminUserActivity from "./pages/AdminUserActivity";

import AdminTraffic from "./pages/AdminTraffic";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import AdminAnalyticsDashboard from "./pages/AdminAnalyticsDashboard";
import Achievements from "./pages/Achievements";
import AdminLogin from "./pages/AdminLogin";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse">Loading...</div>
    </div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  useUnifiedNotifications();
  
  // Map routes to transition variants
  const getTransitionVariant = (pathname: string) => {
    if (pathname === '/') return 'fade';
    if (pathname === '/auth' || pathname === '/reset-password') return 'scale';
    if (pathname.startsWith('/admin')) return 'slideUp';
    if (pathname === '/chat' || pathname === '/history') return 'slideRight';
    if (pathname === '/dashboard' || pathname === '/profile') return 'slideLeft';
    return 'fade';
  };
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition variant={getTransitionVariant('/')}><Home /></PageTransition>} />
        <Route path="/auth" element={<PageTransition variant={getTransitionVariant('/auth')}><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition variant={getTransitionVariant('/reset-password')}><ResetPassword /></PageTransition>} />
        <Route path="/reset-password-confirm" element={<PageTransition variant="scale"><ResetPasswordConfirm /></PageTransition>} />
        <Route path="/privacy-policy" element={<PageTransition variant="fade"><PrivacyPolicy /></PageTransition>} />
        <Route path="/terms-of-service" element={<PageTransition variant="fade"><TermsOfService /></PageTransition>} />
        <Route path="/link-phone" element={<ProtectedRoute><PageTransition variant="scale"><LinkPhone /></PageTransition></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PageTransition variant={getTransitionVariant('/chat')}><Chat /></PageTransition></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><PageTransition variant={getTransitionVariant('/history')}><History /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition variant={getTransitionVariant('/profile')}><ProfileSettings /></PageTransition></ProtectedRoute>} />
        <Route path="/upgrade" element={<ProtectedRoute><PageTransition variant="fade"><Upgrade /></PageTransition></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition variant={getTransitionVariant('/admin')}><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><PageTransition variant="slideUp"><AdminDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><PageTransition variant="slideUp"><Analytics /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/advanced-analytics" element={<ProtectedRoute><PageTransition variant="slideUp"><AdminAnalyticsDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/payment" element={<PageTransition variant="scale"><Payment /></PageTransition>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition variant={getTransitionVariant('/dashboard')}><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/old-analytics" element={<ProtectedRoute><PageTransition variant="slideUp"><AdminAnalytics /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><PageTransition variant="slideUp"><UserManagement /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/activity" element={<ProtectedRoute><PageTransition variant="slideUp"><AdminUserActivity /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/traffic" element={<ProtectedRoute><PageTransition variant="slideUp"><AdminTraffic /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/user/:userId" element={<ProtectedRoute><PageTransition variant="slideUp"><AdminUserDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/image-gallery" element={<ProtectedRoute><PageTransition variant="slideRight"><ImageGallery /></PageTransition></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><PageTransition variant="slideRight"><Achievements /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/insights" element={<ProtectedRoute><PageTransition variant="fade"><AdminInsights /></PageTransition></ProtectedRoute>} />
        <Route path="/admin-login" element={<PageTransition variant="scale"><AdminLogin /></PageTransition>} />
        <Route path="/support" element={<PageTransition variant="fade"><Support /></PageTransition>} />
        <Route path="*" element={<PageTransition variant="fade"><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <CursorProvider>
        <CustomCursor />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AnimatedRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CursorProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
