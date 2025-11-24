import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Home from "./Home";

const Index = () => {
  const { user } = useAuth();

  // Redirect logged-in users directly to chat
  if (user) {
    return <Navigate to="/chat" replace />;
  }

  // Show landing page for logged-out users
  return <Home />;
};

export default Index;
