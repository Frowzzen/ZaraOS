import { Hero } from "@/components/Hero";
import { ProductShowcase } from "@/components/ProductShowcase";
import { EarlyAccessForm } from "@/components/EarlyAccessForm";
import { InterfacePreview } from "@/components/InterfacePreview";
import { SecuritySection } from "@/components/SecuritySection";
import { motion } from "framer-motion";

function Features() {
  const features = [
    {
      title: "Local Intelligence",
      desc: "LLMs run directly on your hardware. Zero latency. Zero cloud dependency. Full privacy.",
      num: "01"
    },
    {
      title: "Voice Core",
      desc: "Zara listens, understands, and executes system-level commands seamlessly.",
      num: "02"
    },
    {
      title: "Adaptive UI",
      desc: "An interface that shifts based on your workflow, preempting your next action.",
      num: "03"
    }
  ];

  return (
    <section className="py-32 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <motion.div 
              key={f.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="border-t border-white/10 pt-8"
            >
              <div className="text-primary font-mono text-sm mb-4">[{f.num}]</div>
              <h3 className="font-serif text-2xl uppercase tracking-tight mb-4">{f.title}</h3>
              <p className="font-mono text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-white/5 text-center flex flex-col items-center bg-black relative">
      <img src="/zaraos-wordmark-flat.png" alt="ZaraOS" className="h-6 mb-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500" />
      <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
        © {new Date().getFullYear()} ZaraOS Systems. All parameters normal.
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-black">
      <Hero />
      <Features />
      <ProductShowcase />
      <InterfacePreview />
      <SecuritySection />
      <EarlyAccessForm />
      <Footer />
    </div>
  );
}
