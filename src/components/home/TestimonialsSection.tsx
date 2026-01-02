import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Arjun Sharma",
    role: "Software Developer",
    company: "TechCorp India",
    avatar: "AS",
    content: "Magverse AI has completely transformed how I approach coding problems. The multi-model comparison feature is a game-changer!",
    rating: 5,
  },
  {
    id: 2,
    name: "Priya Patel",
    role: "Data Scientist",
    company: "Analytics Pro",
    avatar: "PP",
    content: "The Perplexity integration with real-time sources is incredible. I can now research with confidence knowing my information is up-to-date.",
    rating: 5,
  },
  {
    id: 3,
    name: "Rahul Verma",
    role: "Product Manager",
    company: "StartupXYZ",
    avatar: "RV",
    content: "Finally, one platform to access all the best AI models. The credit system is fair and the response quality is exceptional.",
    rating: 5,
  },
  {
    id: 4,
    name: "Sneha Gupta",
    role: "Content Creator",
    company: "Digital Media Co",
    avatar: "SG",
    content: "The image generation feature is amazing! I create all my thumbnails and social media graphics using Magverse AI now.",
    rating: 5,
  },
  {
    id: 5,
    name: "Vikram Singh",
    role: "Entrepreneur",
    company: "Startup Founder",
    avatar: "VS",
    content: "Best AI platform I've used. The reasoning mode helps me think through complex business decisions step by step.",
    rating: 5,
  },
  {
    id: 6,
    name: "Ananya Krishnan",
    role: "Research Scholar",
    company: "IIT Delhi",
    avatar: "AK",
    content: "The deep research feature with citations is perfect for academic work. It saves me hours of literature review time.",
    rating: 5,
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-28 relative z-10 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 spotlight-center pointer-events-none opacity-30" />
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-foreground">Loved by Thousands</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              What Our Users Say
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of satisfied users who've transformed their workflow with Magverse AI.
          </p>
        </motion.div>

        {/* Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="break-inside-avoid"
            >
              <div className="bg-card border border-border rounded-2xl p-6 card-hover-effect group relative overflow-hidden">
                {/* Quote icon */}
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Quote className="w-12 h-12 text-primary" />
                </div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  
                  {/* Testimonial text */}
                  <p className="text-foreground/90 leading-relaxed mb-6">
                    "{testimonial.content}"
                  </p>
                  
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
