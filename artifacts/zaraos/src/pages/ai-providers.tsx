import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { aiEngine, AIProvider } from "@/lib/ai-engine";
import { Cpu } from "lucide-react";

interface ProviderData {
  id: AIProvider;
  name: string;
  isLocal: boolean;
}

export default function AIProviders() {
  const providers: ProviderData[] = [
    { id: "local", name: "Zara Core v1 (Built-in)", isLocal: true },
    { id: "ollama", name: "Local Ollama", isLocal: true },
    { id: "openai", name: "OpenAI", isLocal: false },
    { id: "anthropic", name: "Anthropic", isLocal: false },
  ];

  const [activeProvider, setActiveProvider] = useState<AIProvider>("local");

  const handleSetPrimary = (id: AIProvider) => {
    setActiveProvider(id);
    aiEngine.selectProvider(id);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8 h-full">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Cpu className="w-10 h-10 text-primary" />
            AI Provider Management
          </h1>
          <p className="text-muted-foreground font-mono text-sm">Configure where Zara's brain runs. Keys are stored locally.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map((p) => (
            <Card key={p.id} className={`bg-card/40 border-white/5 backdrop-blur ${activeProvider === p.id ? 'border-primary/50 shadow-[0_0_20px_rgba(0,240,255,0.1)]' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  {p.isLocal ? (
                    <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">LOCAL</span>
                  ) : (
                    <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">CLOUD</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {!p.isLocal && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-mono">API Key</label>
                    <Input type="password" placeholder="sk-..." className="bg-black/50 border-white/10" data-testid={`input-key-${p.id}`} />
                  </div>
                )}
                {p.isLocal && p.id !== "local" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-mono">Endpoint URL</label>
                    <Input placeholder="http://localhost:11434" className="bg-black/50 border-white/10" />
                  </div>
                )}
                {p.id === "local" && (
                  <p className="text-sm text-muted-foreground">Default optimized model shipped with ZaraOS.</p>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Set as Primary</span>
                <Switch checked={activeProvider === p.id} onCheckedChange={() => handleSetPrimary(p.id)} data-testid={`switch-provider-${p.id}`} />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
