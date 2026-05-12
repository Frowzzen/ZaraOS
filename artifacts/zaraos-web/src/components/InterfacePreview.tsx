import { motion } from "framer-motion";

export function InterfacePreview() {
  const terminalLines = [
    "> Initializing ZaraOS Core...",
    "> Loading local language models (Mistral-7B-Instruct)...",
    "> Mounting encrypted volume...",
    "> Establishing neural pathways...",
    "> Audio input ready.",
    "> System online. Waiting for command."
  ];

  return (
    <section className="py-24 px-4 bg-background border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(0,212,212,0.05)_0,transparent_50%)]" />
      
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex-1 space-y-6"
        >
          <h2 className="font-serif text-3xl md:text-4xl uppercase tracking-tighter text-white">
            Command via Thought. <br/>Or Terminal.
          </h2>
          <p className="font-mono text-muted-foreground">
            No more hunting through menus. Zara listens to your voice and types commands instantly. Need to build a project? Just say it. Need to analyze a file? Drag it in and ask. 
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-1 w-full"
        >
          <div className="bg-black border border-white/10 p-4 font-mono text-sm h-80 overflow-hidden relative group">
            <div className="flex gap-2 mb-4 opacity-50">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            
            <div className="space-y-2">
              {terminalLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.1, delay: 0.5 + i * 0.2 }}
                  className="text-primary/80"
                >
                  {line}
                </motion.div>
              ))}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-5 bg-primary inline-block align-middle mt-2"
              />
            </div>

            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
