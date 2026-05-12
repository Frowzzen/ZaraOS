import { motion } from "framer-motion";

export function SecuritySection() {
  return (
    <section className="py-24 px-4 bg-[#050505] relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-secondary font-mono text-sm mb-6 uppercase tracking-widest">[ Absolute Isolation ]</div>
          <h2 className="font-serif text-3xl md:text-5xl uppercase tracking-tighter text-white mb-8">
            Your Data. <br className="md:hidden" />Your Hardware.
          </h2>
          <p className="font-mono text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            The AI runs directly on your machine. No telemetry. No cloud API calls. No data harvesting. Zara OS is entirely self-contained and air-gap ready.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="border border-white/5 p-6 bg-black/50 hover:border-secondary/30 transition-colors">
              <h3 className="font-serif uppercase text-xl mb-2 text-white">Encrypted OS</h3>
              <p className="font-mono text-sm text-gray-500">The entire USB volume is AES-256 encrypted. Remove the drive, and your environment vanishes.</p>
            </div>
            <div className="border border-white/5 p-6 bg-black/50 hover:border-secondary/30 transition-colors">
              <h3 className="font-serif uppercase text-xl mb-2 text-white">Local Execution</h3>
              <p className="font-mono text-sm text-gray-500">Llama, Mistral, and Whisper run on your CPU/GPU. No internet required to think.</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Decorative background grid */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </section>
  );
}
