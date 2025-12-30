import { motion } from "framer-motion";
import { Mail, Linkedin, GraduationCap, MapPin, Briefcase, Sparkles, Shield, Cpu, Wallet, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import founderImage from "@/assets/founder-nimish.png";

export const FounderSection = () => {
  const skills = [
    { icon: Cpu, label: "Artificial Intelligence" },
    { icon: Wallet, label: "Financial Technology" },
    { icon: Globe, label: "Web Development" },
    { icon: Shield, label: "Cybersecurity" },
  ];

  const focusAreas = [
    "Neobanking & Fintech",
    "AI/ML in Finance",
    "Blockchain & Web3",
    "Encryption & Security"
  ];

  return (
    <section className="py-24 relative z-10 overflow-hidden">
      {/* Geometric background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 border border-primary/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 border border-purple-500/20 rounded-full translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border border-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <Sparkles className="w-3 h-3 mr-1" />
            Meet the Founder
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-foreground">About the </span>
            <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Founder
            </span>
          </h2>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative group">
                {/* Gradient border effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                
                {/* Image container */}
                <div className="relative bg-card rounded-2xl overflow-hidden border border-border/50">
                  <img 
                    src={founderImage} 
                    alt="Nimish Kalsi - Founder of MagverseAI"
                    className="w-full h-auto object-cover aspect-square"
                  />
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  
                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-foreground">Nimish Kalsi</h3>
                    <p className="text-primary font-medium">Founder & Developer</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Content Section */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-6"
            >
              {/* Location & Education */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Ludhiana, Punjab, India</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span>BBA in Fintech with AI, Chitkara University (2024-2027)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span>MagverseAI launched October 2025</span>
                </div>
              </div>

              {/* About text */}
              <div className="space-y-4 text-muted-foreground">
                <p>
                  A first-year student already running a live AI platform, Nimish brings a hands-on approach to building MagverseAI—handling full-stack development, UI/UX design, and deployment end-to-end.
                </p>
                <p>
                  His core philosophy is simple: <span className="text-foreground font-medium">making advanced AI technology accessible without prohibitive costs.</span> Through MagverseAI, he's democratizing access to premium AI models with flexible, affordable pricing.
                </p>
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Top Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge 
                      key={index}
                      variant="secondary" 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <skill.icon className="w-3 h-3" />
                      {skill.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Focus Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map((area, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="border-primary/30 bg-primary/5 text-foreground"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={() => window.open('https://linkedin.com/in/nimishkalsi', '_blank')}
                >
                  <Linkedin className="w-4 h-4" />
                  Connect on LinkedIn
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-primary/30 hover:bg-primary/10"
                  onClick={() => window.open('mailto:nimishkalsi1@gmail.com', '_blank')}
                >
                  <Mail className="w-4 h-4" />
                  Get in Touch
                </Button>
              </div>

              {/* Open to opportunities */}
              <div className="pt-4">
                <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                  Open to Internships & Collaborations
                </Badge>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
