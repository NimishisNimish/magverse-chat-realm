import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CursorProvider } from "@/contexts/CursorContext";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useUnifiedNotifications } from "@/hooks/useUnifiedNotifications";
import { useAdminModelHealthNotifications } from "@/hooks/useAdminModelHealthNotifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { lazy, Suspense } from 'react';
import { LazyLoadFallback } from "@/components/LazyLoadFallback";

// Static imports for fast initial load
import Index from "./pages/Index";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AIModels from "./pages/AIModels";

// Lazy load admin pages (simplified)
const Admin = lazy(() => import("./pages/Admin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));

// Lazy load non-admin pages
const History = lazy(() => import("./pages/History"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const ImageGallery = lazy(() => import("./pages/ImageGallery"));
const ModelComparison = lazy(() => import("./pages/ModelComparison"));
const Support = lazy(() => import("./pages/Support"));
const Settings = lazy(() => import("./pages/Settings"));
const TokenUsage = lazy(() => import("./pages/TokenUsage"));

// Lazy load lightweight pages
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ResetPasswordConfirm = lazy(() => import("./pages/ResetPasswordConfirm"));
const LinkPhone = lazy(() => import("./pages/LinkPhone"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse">Loading...</div>
    </div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

// Allows both guests and authenticated users
const GuestAllowedRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse">Loading...</div>
    </div>;
  }
  
  // Allow everyone - guests and authenticated users
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  useUnifiedNotifications();
  useAdminModelHealthNotifications();
  
  // Map routes to transition variants
  const getTransitionVariant = (pathname: string) => {
    if (pathname === '/') return 'fade';
    if (pathname === '/auth' || pathname === '/reset-password') return 'scale';
    if (pathname.startsWith('/admin')) return 'slideUp';
    if (pathname === '/chat' || pathname === '/history') return 'slideRight';
    if (pathname === '/profile') return 'slideLeft';
    return 'fade';
  };
  
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LazyLoadFallback />}>
        <Routes location={location} key={location.pathname}>
          {/* Static routes for fast initial load */}
          <Route path="/" element={<PageTransition variant={getTransitionVariant('/')}><Index /></PageTransition>} />
          <Route path="/home" element={<PageTransition variant={getTransitionVariant('/')}><Home /></PageTransition>} />
          <Route path="/models" element={<PageTransition variant="fade"><AIModels /></PageTransition>} />
          <Route path="/auth" element={<PageTransition variant={getTransitionVariant('/auth')}><Auth /></PageTransition>} />
          <Route path="/chat" element={<GuestAllowedRoute><PageTransition variant={getTransitionVariant('/chat')}><Chat /></PageTransition></GuestAllowedRoute>} />
          
          {/* Lazy-loaded routes */}
          <Route path="/reset-password" element={<PageTransition variant="scale"><ResetPassword /></PageTransition>} />
          <Route path="/reset-password-confirm" element={<PageTransition variant="scale"><ResetPasswordConfirm /></PageTransition>} />
          <Route path="/privacy-policy" element={<PageTransition variant="fade"><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms-of-service" element={<PageTransition variant="fade"><TermsOfService /></PageTransition>} />
          <Route path="/link-phone" element={<ProtectedRoute><PageTransition variant="scale"><LinkPhone /></PageTransition></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><PageTransition variant={getTransitionVariant('/history')}><History /></PageTransition></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageTransition variant={getTransitionVariant('/profile')}><ProfileSettings /></PageTransition></ProtectedRoute>} />
          <Route path="/image-gallery" element={<ProtectedRoute><PageTransition variant="slideRight"><ImageGallery /></PageTransition></ProtectedRoute>} />
          <Route path="/support" element={<PageTransition variant="fade"><Support /></PageTransition>} />
          <Route path="/comparison" element={<ProtectedRoute><PageTransition variant="fade"><ModelComparison /></PageTransition></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PageTransition variant="fade"><Settings /></PageTransition></ProtectedRoute>} />
          <Route path="/token-usage" element={<ProtectedRoute><PageTransition variant="fade"><TokenUsage /></PageTransition></ProtectedRoute>} />
          
          {/* Admin routes (simplified) */}
          <Route path="/admin" element={<AdminProtectedRoute><PageTransition variant={getTransitionVariant('/admin')}><Admin /></PageTransition></AdminProtectedRoute>} />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><PageTransition variant="slideUp"><AdminDashboard /></PageTransition></AdminProtectedRoute>} />
          <Route path="/admin/analytics" element={<AdminProtectedRoute><PageTransition variant="slideUp"><Analytics /></PageTransition></AdminProtectedRoute>} />
          <Route path="/admin-login" element={<PageTransition variant="scale"><AdminLogin /></PageTransition>} />
          
          <Route path="*" element={<PageTransition variant="fade"><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <CursorProvider>
          <OfflineIndicator />
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
  </ErrorBoundary>
);

export default App;
