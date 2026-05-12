import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,212,212,0.1)_0,transparent_50%)]" />
      
      <div className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        <motion.img 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          src="/zaraos-wordmark.png" 
          alt="ZaraOS" 
          className="h-12 md:h-16 mb-16 object-contain" 
        />
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter uppercase text-white mb-6 leading-tight"
        >
          A MACHINE THAT <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">THINKS WITH YOU</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-2xl text-lg md:text-xl text-muted-foreground font-mono mb-12"
        >
          The first AI-native desktop OS. Runs locally. Boots from USB. Private by design. Your computer is finally alive.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 w-full justify-center"
        >
          <Button size="lg" className="font-mono uppercase tracking-wider text-sm px-8 rounded-none border-primary border">
            Get Early Access
          </Button>
          <Button size="lg" variant="outline" className="font-mono uppercase tracking-wider text-sm px-8 rounded-none">
            Read Manifesto
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
