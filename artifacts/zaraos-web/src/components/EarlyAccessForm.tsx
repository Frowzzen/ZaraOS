import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email("Invalid transmission address."),
});

export function EarlyAccessForm() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitted(true);
  }

  return (
    <section className="py-32 px-4 relative flex justify-center border-t border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(74,0,224,0.1)_0,transparent_60%)]" />
      
      <div className="max-w-2xl w-full z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <img src="/zaraos-icon-3d.png" alt="Z" className="w-24 h-24 mx-auto mb-8 opacity-80" />
          <h2 className="font-serif text-3xl md:text-4xl uppercase tracking-tighter mb-4">Initialize Sequence</h2>
          <p className="font-mono text-muted-foreground mb-12">
            Alpha builds are shipping soon. Secure your place in the queue.
          </p>

          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 border border-primary/30 bg-primary/5 text-primary font-mono text-sm uppercase tracking-widest"
            >
              [ Transmission Accepted. Awaiting Deployment. ]
            </motion.div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="ENTER_EMAIL_ADDRESS" 
                          className="rounded-none border-white/20 bg-black/50 font-mono text-sm uppercase h-12 focus-visible:ring-primary focus-visible:border-primary" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs text-destructive text-left" />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="rounded-none h-12 font-mono uppercase tracking-wider px-8 border border-primary">
                  Request Access
                </Button>
              </form>
            </Form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
