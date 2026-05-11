import { Layout } from "@/components/layout";
import { usePrivacy } from "@/lib/privacy-store";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Mic, Camera, Cpu, Cloud, Network } from "lucide-react";

export default function Privacy() {
  const privacy = usePrivacy();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto flex flex-col gap-8 h-full">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-green-400" />
            Privacy & Security
          </h1>
          <p className="text-muted-foreground font-mono text-sm">Manage hardware access and AI inference locations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" /> Hardware Sensors
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Microphone</div>
                  <div className="text-sm text-muted-foreground">Allow Zara to listen for voice commands</div>
                </div>
                <div className="flex items-center gap-3">
                  {privacy.micActive && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>}
                  <Switch checked={privacy.micActive} onCheckedChange={privacy.setMicActive} data-testid="switch-mic" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Camera</div>
                  <div className="text-sm text-muted-foreground">Allow gesture tracking</div>
                </div>
                <div className="flex items-center gap-3">
                  {privacy.cameraActive && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>}
                  <Switch checked={privacy.cameraActive} onCheckedChange={privacy.setCameraActive} data-testid="switch-camera" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" /> Inference Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Local AI (Ollama/Llama.cpp)</div>
                  <div className="text-sm text-muted-foreground">Process data on-device (maximum privacy)</div>
                </div>
                <Switch checked={privacy.localAIRunning} onCheckedChange={privacy.setLocalAIRunning} data-testid="switch-local-ai" />
              </div>
              <div className="flex items-center justify-between opacity-50">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">Cloud AI <span className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded border border-red-500/30">RISK</span></div>
                  <div className="text-sm text-muted-foreground">Send data to external providers</div>
                </div>
                <Switch checked={privacy.cloudAIRunning} onCheckedChange={privacy.setCloudAIRunning} disabled data-testid="switch-cloud-ai" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
