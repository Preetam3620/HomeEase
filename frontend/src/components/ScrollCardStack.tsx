import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Wrench, Users, Zap, Shield, Clock, Award, Target, Sparkles } from 'lucide-react';

interface CardData {
  icon: any;
  title: string;
  description: string;
  color: string;
}

const cards: CardData[] = [
  {
    icon: Wrench,
    title: "Expert Technicians",
    description: "Certified professionals ready to help",
    color: "from-primary to-accent"
  },
  {
    icon: Shield,
    title: "Verified & Insured",
    description: "All providers are background checked",
    color: "from-primary to-secondary"
  },
  {
    icon: Zap,
    title: "Instant Booking",
    description: "Get matched in seconds",
    color: "from-secondary to-primary"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Service when you need it most",
    color: "from-accent to-primary"
  },
  {
    icon: Award,
    title: "Top Rated",
    description: "4.9 average customer rating",
    color: "from-secondary to-accent"
  }
];

const ScrollCardStack = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        // 1x viewport height as requested
        setContainerHeight(window.innerHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Calculate circular positions for each card
  const getExpandedPosition = (index: number, total: number) => {
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.5;
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotate: (angle * 180 / Math.PI) + 90
    };
  };

  return (
    <div 
      ref={containerRef} 
      className="relative"
      style={{ height: `${containerHeight}px` }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Center Content */}
          <motion.div
            className="absolute z-20 text-center max-w-2xl px-6"
            style={{
              opacity: useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
              scale: useTransform(smoothProgress, [0, 0.2], [0.8, 1]),
              y: useTransform(smoothProgress, [0, 0.3, 1], [0, 0, -window.innerHeight * 0.65])
            }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gradient">
              Why Choose HomeEase?
            </h2>
            <p className="text-xl text-muted-foreground">
              Discover what makes us the #1 choice for service needs
            </p>
          </motion.div>

          {/* Animated Cards */}
          {cards.map((card, index) => {
            const expanded = getExpandedPosition(index, cards.length);
            
            return (
              <motion.div
                key={index}
                className="absolute"
                style={{
                  x: useTransform(
                    smoothProgress,
                    [0, 0.3, 1],
                    [0, 0, expanded.x]
                  ),
                  y: useTransform(
                    smoothProgress,
                    [0, 0.3, 1],
                    [index * 20, index * 20, expanded.y]
                  ),
                  rotate: useTransform(
                    smoothProgress,
                    [0, 0.5, 1],
                    [0, expanded.rotate, 0]
                  ),
                  scale: useTransform(
                    smoothProgress,
                    [0, 0.3, 1],
                    [0.85, 0.9, 1]
                  ),
                  zIndex: cards.length - index,
                }}
              >
                <Card 
                  className="w-72 md:w-80 p-8 glass-morphism hover-glow border-2 border-primary/20 cursor-pointer"
                  style={{
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <motion.div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <card.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3">{card.title}</h3>
                  <p className="text-muted-foreground">{card.description}</p>
                </Card>
              </motion.div>
            );
          })}

          {/* Background gradient blob */}
          <motion.div
            className="absolute w-[800px] h-[800px] bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 rounded-full blur-3xl"
            style={{
              scale: useTransform(smoothProgress, [0, 0.5, 1], [0.5, 1.5, 1.3]),
              opacity: useTransform(smoothProgress, [0, 0.3, 1], [0.3, 0.6, 0.5]),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ScrollCardStack;
