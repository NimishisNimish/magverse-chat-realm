import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSection } from "@/components/home/HeroSection";
import { IndustryLeaders } from "@/components/home/IndustryLeaders";
import { AdvancedModelLibrary } from "@/components/home/AdvancedModelLibrary";
import { SuperchargeWorkflow } from "@/components/home/SuperchargeWorkflow";
import { Footer } from "@/components/home/Footer";
import { useEffect } from "react";

const Home = () => {
  const { user } = useAuth();

  // Prefetch Chat page
  useEffect(() => {
    const timer = setTimeout(() => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/chat';
      document.head.appendChild(link);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <Navbar />
      <HeroSection user={user} />
      <IndustryLeaders />
      <AdvancedModelLibrary />
      <SuperchargeWorkflow />
      <Footer />
    </div>
  );
};

export default Home;
