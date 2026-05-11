import { Layout } from "@/components/layout";
import { usePrivacy } from "@/lib/privacy-store";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { skillRuntime } from "@/core/skills/skill-runtime";
import {
  ShieldCheck,
  Mic,
  Camera,
  Cpu,
  Cloud,
  Network,
  FolderOpen,
  Zap,
  XCircle,
  AlertTriangle,
} from "lucide-react";

// Skills that require each sensitive permission
const MIC_SKILLS    = skillRuntime.listSkills().filter((s) => s.permissions.includes("microphone"));
const CAM_SKILLS    = skillRuntime.listSkills().filter((s) => s.permissions.includes("camera"));
const FILE_SKILLS   = skillRuntime.listSkills().filter((s) => s.permissions.includes("files"));
const NET_SKILLS    = skillRuntime.listSkills().filter((s) => s.permissions.includes("network"));
const CLOUD_SKILLS  = skillRuntime.listSkills().filter((s) => s.permissions.includes("cloud_ai"));
const CONFIRM_SKILLS = skillRuntime.listSkills().filter((s) => s.requiresConfirmation || s.dangerous);

function SkillPillList({ skills, max = 4 }: { skills: ReturnType<typeof skillRuntime.listSkills>; max?: number }) {
  const shown = skills.slice(0, max);
  const rest  = skills.length - max;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {shown.map((s) => (
        <span key={s.id} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-muted-foreground">
          {s.name}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-muted-foreground/50">
          +{rest} more
        </span>
      )}
    </div>
  );
}

export default function Privacy() {
  const privacy = usePrivacy();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-green-400" />
            Privacy & Security
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Manage hardware access, connected services, and skill permissions.
          </p>
        </div>

        {/* ── Hardware Sensors + Inference ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
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
                  {privacy.micActive && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  <Switch checked={privacy.micActive} onCheckedChange={privacy.setMicActive} data-testid="switch-mic" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Camera</div>
                  <div className="text-sm text-muted-foreground">Allow gesture tracking</div>
                </div>
                <div className="flex items-center gap-3">
                  {privacy.cameraActive && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  <Switch checked={privacy.cameraActive} onCheckedChange={privacy.setCameraActive} data-testid="switch-camera" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
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
                  <div className="font-bold text-white flex items-center gap-2">
                    Cloud AI
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded border border-red-500/30">RISK</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Send data to external providers</div>
                </div>
                <Switch checked={privacy.cloudAIRunning} onCheckedChange={privacy.setCloudAIRunning} disabled data-testid="switch-cloud-ai" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Connected Services ───────────────────────────────── */}
        <Card className="bg-card/40 border-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="w-5 h-5 text-blue-400" /> Connected Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-mono mb-4">
              All external services are disconnected by default. Connect services in Settings to enable cloud skills.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Email Account",      icon: <Mic className="w-4 h-4 text-blue-400" />,   status: "Disconnected" },
                { name: "Calendar Service",   icon: <Cloud className="w-4 h-4 text-cyan-400" />,  status: "Disconnected" },
                { name: "Phone / SMS",        icon: <Mic className="w-4 h-4 text-green-400" />,   status: "Disconnected" },
                { name: "Ollama (Local AI)",  icon: <Cpu className="w-4 h-4 text-purple-400" />,  status: "Disconnected" },
                { name: "OpenAI",             icon: <Cloud className="w-4 h-4 text-emerald-400" />, status: "Disconnected" },
                { name: "Contacts Sync",      icon: <Network className="w-4 h-4 text-amber-400" />, status: "Disconnected" },
              ].map((svc) => (
                <div key={svc.name} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
                  <div className="flex items-center gap-2">
                    {svc.icon}
                    <span className="text-sm font-medium text-white">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                    <span className="text-xs font-mono text-muted-foreground/50">{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Skill Privacy Breakdown ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mic className="w-4 h-4 text-amber-400" />
                Skills Using Microphone
                <span className="ml-auto text-amber-400 font-mono text-sm">{MIC_SKILLS.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillPillList skills={MIC_SKILLS} />
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="w-4 h-4 text-purple-400" />
                Skills Using Camera
                <span className="ml-auto text-purple-400 font-mono text-sm">{CAM_SKILLS.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillPillList skills={CAM_SKILLS} />
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4 text-green-400" />
                Skills Using File Access
                <span className="ml-auto text-green-400 font-mono text-sm">{FILE_SKILLS.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillPillList skills={FILE_SKILLS} />
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Network className="w-4 h-4 text-blue-400" />
                Skills Using Network
                <span className="ml-auto text-blue-400 font-mono text-sm">{NET_SKILLS.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillPillList skills={NET_SKILLS} />
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cloud className="w-4 h-4 text-red-400" />
                Skills Using Cloud AI
                <span className="ml-auto text-red-400 font-mono text-sm">{CLOUD_SKILLS.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillPillList skills={CLOUD_SKILLS} />
              <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">
                Cloud AI is opt-in and requires your own API key. Zero data is sent without consent.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Skills Requiring Confirmation
                <span className="ml-auto text-amber-400 font-mono text-sm">{CONFIRM_SKILLS.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillPillList skills={CONFIRM_SKILLS} />
              <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">
                These skills show a confirmation dialog before executing any action.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Privacy Guarantee ───────────────────────────────── */}
        <Card className="bg-green-500/5 border-green-500/20 backdrop-blur">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-400 mb-1">ZaraOS Privacy Guarantee (Alpha)</p>
                <ul className="text-xs text-muted-foreground font-mono space-y-1 leading-relaxed">
                  <li>No real emails, texts, or calls are sent in Alpha 0.2</li>
                  <li>No files are deleted or modified</li>
                  <li>No cloud AI calls are made — all responses are mocked</li>
                  <li>No API keys are transmitted or logged</li>
                  <li>No personal content is ever sent to ZaraOS servers</li>
                  <li>All skill execution is local or mocked</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills Hub link */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/15">
          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            View all skills and their permission requirements in the{" "}
            <a href="/skills" className="text-primary hover:underline font-medium">Zara Skills Hub</a>.
          </p>
        </div>
      </div>
    </Layout>
  );
}
