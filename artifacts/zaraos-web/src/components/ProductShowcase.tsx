import { motion } from "framer-motion";

export function ProductShowcase() {
  return (
    <section className="py-24 px-4 bg-black relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(74,0,224,0.05)_50%,transparent)]" />
      
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-12 lg:gap-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="flex-1"
        >
          <img 
            src="/zaraos-usb-mockup.png" 
            alt="ZaraOS USB Drive" 
            className="w-full h-auto drop-shadow-[0_0_40px_rgba(0,212,212,0.3)] filter"
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 space-y-6"
        >
          <h2 className="font-serif text-3xl md:text-5xl uppercase tracking-tight text-white">
            PLUG IN.<br/>WAKE UP.
          </h2>
          <div className="h-1 w-24 bg-primary" />
          <p className="font-mono text-muted-foreground text-lg">
            ZaraOS ships on a high-speed encrypted USB drive. No installation required. Boot any x86 machine directly into an AI-first environment. 
          </p>
          <ul className="space-y-4 font-mono text-sm text-gray-400 mt-8">
            <li className="flex items-center gap-3">
              <span className="text-primary">01_</span> Live boot environment
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary">02_</span> Persistent encrypted storage
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary">03_</span> Pre-loaded with local LLMs
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary">04_</span> Air-gapped privacy
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
