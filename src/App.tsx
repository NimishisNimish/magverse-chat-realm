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
import ModelComparison from "./pages/ModelComparison";
import ImageGallery from "./pages/ImageGallery";
import ProAnalytics from "./pages/ProAnalytics";
import AdminUserActivity from "./pages/AdminUserActivity";
import AdminPaymentQueue from "./pages/AdminPaymentQueue";
import AdminTraffic from "./pages/AdminTraffic";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import AdminAnalyticsDashboard from "./pages/AdminAnalyticsDashboard";

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
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/reset-password-confirm" element={<PageTransition><ResetPasswordConfirm /></PageTransition>} />
        <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
        <Route path="/terms-of-service" element={<PageTransition><TermsOfService /></PageTransition>} />
        <Route path="/link-phone" element={<ProtectedRoute><PageTransition><LinkPhone /></PageTransition></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PageTransition><Chat /></PageTransition></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><PageTransition><History /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><ProfileSettings /></PageTransition></ProtectedRoute>} />
        <Route path="/upgrade" element={<ProtectedRoute><PageTransition><Upgrade /></PageTransition></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><PageTransition><AdminDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><PageTransition><Analytics /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/advanced-analytics" element={<ProtectedRoute><PageTransition><AdminAnalyticsDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/payment" element={<PageTransition><Payment /></PageTransition>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/old-analytics" element={<ProtectedRoute><PageTransition><AdminAnalytics /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><PageTransition><UserManagement /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/activity" element={<ProtectedRoute><PageTransition><AdminUserActivity /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/payment-queue" element={<ProtectedRoute><PageTransition><AdminPaymentQueue /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/traffic" element={<ProtectedRoute><PageTransition><AdminTraffic /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/user/:userId" element={<ProtectedRoute><PageTransition><AdminUserDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/model-comparison" element={<ProtectedRoute><PageTransition><ModelComparison /></PageTransition></ProtectedRoute>} />
        <Route path="/image-gallery" element={<ProtectedRoute><PageTransition><ImageGallery /></PageTransition></ProtectedRoute>} />
        <Route path="/pro-analytics" element={<ProtectedRoute><PageTransition><ProAnalytics /></PageTransition></ProtectedRoute>} />
        <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
