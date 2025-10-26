import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Zap, 
  Shield, 
  MapPin, 
  Clock,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Star,
  Award,
  Target,
  Rocket
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedCounter from "@/components/AnimatedCounter";
import InfiniteScroll from "@/components/InfiniteScroll";
import ScrollCardStack from "@/components/ScrollCardStack";

const Landing = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const houseServices = [
    { icon: Wrench, name: "AC Repair", desc: "Expert air conditioning maintenance and repair", detail: "Fast response times" },
    { icon: Zap, name: "Electrical", desc: "Licensed electricians for all your needs", detail: "24/7 emergency service" },
    { icon: Shield, name: "Plumbing", desc: "Professional plumbing repairs & installations", detail: "Same-day service" },
    { icon: Sparkles, name: "Cleaning", desc: "Professional home cleaning services", detail: "Eco-friendly products" },
    { icon: Award, name: "Carpentry", desc: "Skilled woodwork and furniture repair", detail: "Custom solutions" },
    { icon: Target, name: "Painting", desc: "Interior and exterior painting experts", detail: "Quality finishes" },
  ];

  const features = [
    { icon: Zap, title: "Instant Matching", desc: "AI connects you with the perfect pro in seconds", color: "from-primary to-accent" },
    { icon: MapPin, title: "Location Based", desc: "Find verified providers near you instantly", color: "from-accent to-secondary" },
    { icon: Shield, title: "Verified Experts", desc: "All providers vetted and insured", color: "from-secondary to-primary" },
    { icon: Clock, title: "24/7 Available", desc: "Book anytime, get help when you need", color: "from-primary to-secondary" },
  ];

  const testimonials = [
    { name: "Sarah M.", role: "Homeowner", rating: 5, text: "Found an AC tech in 2 minutes. Service was incredible!", avatar: "S" },
    { name: "James K.", role: "Provider", rating: 5, text: "HomeEase keeps me busy with quality leads every day.", avatar: "J" },
    { name: "Priya S.", role: "Professional", rating: 5, text: "Voice booking made it effortless. Absolutely love it!", avatar: "P" },
    { name: "David L.", role: "Business Owner", rating: 5, text: "Best platform for finding reliable service providers!", avatar: "D" },
    { name: "Emma R.", role: "Homeowner", rating: 5, text: "Quick, professional, and trustworthy. Highly recommended!", avatar: "E" },
    { name: "Michael T.", role: "Provider", rating: 5, text: "Great way to grow my business and connect with clients.", avatar: "M" },
  ];

  const partners = [
    { name: "Google Maps", icon: "🗺️" },
    { name: "Stripe", icon: "💳" },
    { name: "AWS", icon: "☁️" },
    { name: "Twilio", icon: "📱" },
    { name: "SendGrid", icon: "✉️" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Premium Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 glass-morphism border-b border-border/50"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">HomeEase</span>
          </motion.div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              How it works
            </a>
            <a href="#categories" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Services
            </a>
            <a href="#testimonials" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Reviews
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth/signin')} className="hidden sm:flex">
              Sign In
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => navigate('/auth/signup')}
                className="bg-gradient-to-r from-primary to-accent hover:shadow-glow transition-all duration-300"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-24 pb-32 overflow-hidden">
        <motion.div 
          style={{ y, opacity }}
          className="absolute inset-0 mesh-gradient"
        />
        
        {/* Animated blobs following mouse */}
        <motion.div 
          className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x * 0.02,
            y: mousePosition.y * 0.02,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          style={{ top: '10%', left: '10%' }}
        />
        <motion.div 
          className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
          animate={{
            x: -mousePosition.x * 0.02,
            y: -mousePosition.y * 0.02,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          style={{ bottom: '10%', right: '10%' }}
        />
        <motion.div 
          className="absolute w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-8 px-6 py-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Service Marketplace
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Book Trusted<br />
              <span className="text-gradient">Services Instantly</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Connect with verified professionals in seconds. Real-time matching, 
              secure payments, and transparent ratings—all in one place.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="text-lg h-16 px-10 bg-gradient-to-r from-primary to-accent hover-glow shadow-xl group"
                  onClick={() => navigate('/auth/signup?role=USER')}
                >
                  <Users className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                  I Need a Service
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg h-16 px-10 border-2 hover:bg-primary hover:text-white hover:border-primary shadow-lg group"
                  onClick={() => navigate('/auth/signup?role=PROVIDER')}
                >
                  <TrendingUp className="w-5 h-5 mr-3 group-hover:translate-y-[-3px] transition-transform" />
                  I'm a Provider
                </Button>
              </motion.div>
            </motion.div>

            {/* Animated Stats */}
            <motion.div 
              className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8 border-t border-border/50"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <motion.div whileHover={{ scale: 1.05 }}>
                <div className="text-4xl font-bold text-gradient mb-2">
                  <AnimatedCounter end={450} suffix="+" />
                </div>
                <div className="text-sm text-muted-foreground">Verified Providers</div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }}>
                <div className="text-4xl font-bold text-gradient mb-2">
                  <AnimatedCounter end={5000} suffix="+" />
                </div>
                <div className="text-sm text-muted-foreground">Jobs Completed</div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }}>
                <div className="text-4xl font-bold text-gradient mb-2">
                  <AnimatedCounter end={4.9} decimals={1} />
                </div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* House Services Section */}
      <section id="categories" className="py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-6 py-2 bg-secondary/10 text-secondary border-secondary/20">
              House Services
            </Badge>
            <h2 className="mb-6">Browse Home Services</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert home maintenance and repair services at your fingertips
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {houseServices.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.02
                }}
              >
                <Card className="group p-6 hover-glow border-2 border-transparent hover:border-primary/20 cursor-pointer bg-card/50 backdrop-blur h-full">
                  <motion.div 
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 shadow-lg"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <service.icon className="w-7 h-7 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{service.desc}</p>
                  <div className="text-xs font-medium text-primary">{service.detail}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works with Stagger Animation */}
      <section id="how-it-works" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-6 py-2 bg-accent/10 text-accent border-accent/20">
              Simple Process
            </Badge>
            <h2 className="mb-6 text-gradient-accent">How HomeEase Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get matched with the right professional in three simple steps
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-4 gap-12 max-w-7xl mx-auto">
            {features.map((feature, i) => (
              <motion.div 
                key={i} 
                className="text-center group"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                whileHover={{ y: -10 }}
              >
                <div className="relative mb-8">
                  <motion.div 
                    className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${feature.color} bg-opacity-10 flex items-center justify-center mx-auto shadow-lg border border-primary/20`}
                    whileHover={{ 
                      scale: 1.1,
                      boxShadow: "0 0 40px rgba(24, 181, 181, 0.4)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <feature.icon className="w-12 h-12 text-white" />
                  </motion.div>
                  <motion.div 
                    className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shadow-lg"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.15 + 0.3 }}
                  >
                    {i + 1}
                  </motion.div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll-Triggered Card Stack - NEW! */}
      <ScrollCardStack />

      {/* Infinite Scrolling Testimonials */}
      <section id="testimonials" className="py-32 bg-gradient-to-b from-muted/30 to-background overflow-hidden">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-6 py-2 bg-primary/10 text-primary border-primary/20">
              Success Stories
            </Badge>
            <h2 className="mb-6">Loved by Users & Providers</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands who trust HomeEase for their service needs
            </p>
          </motion.div>
          
          <InfiniteScroll speed={30}>
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                className="w-96 shrink-0"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 hover-glow-warm border-2 border-transparent hover:border-secondary/20 bg-card/50 backdrop-blur h-full">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: j * 0.1 }}
                      >
                        <Star className="w-5 h-5 fill-warning text-warning" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-lg text-foreground mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-lg">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </InfiniteScroll>
        </div>
      </section>

      {/* Trusted Partners Marquee */}
      <section className="py-20 border-y border-border/50">
        <div className="container mx-auto px-6 mb-8">
          <p className="text-center text-sm text-muted-foreground font-medium tracking-wide">
            TRUSTED BY INDUSTRY LEADERS
          </p>
        </div>
        <InfiniteScroll speed={20}>
          {partners.map((partner, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-3 px-8 shrink-0"
              whileHover={{ scale: 1.1 }}
            >
              <span className="text-4xl">{partner.icon}</span>
              <span className="text-xl font-semibold text-muted-foreground">{partner.name}</span>
            </motion.div>
          ))}
        </InfiniteScroll>
      </section>

      {/* CTA with Animated Background */}
      <section className="py-32 bg-gradient-to-br from-primary via-accent to-secondary text-white relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 opacity-20"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-8 text-white drop-shadow-lg">Ready to Experience<br />Seamless Service?</h2>
            <p className="text-xl md:text-2xl mb-12 text-white/95 max-w-3xl mx-auto leading-relaxed drop-shadow">
              Join thousands of satisfied users and providers on HomeEase today
            </p>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                size="lg" 
                className="text-lg h-16 px-12 shadow-2xl bg-white hover:bg-white text-primary font-bold group"
                onClick={() => navigate('/auth/signup')}
              >
                <CheckCircle2 className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                Create Free Account
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">HomeEase</span>
            </motion.div>
            <p className="text-sm text-muted-foreground">
              © 2025 HomeEase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
