import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code,
  Terminal,
  Boxes,
  Download,
  CheckCircle2,
  ShieldCheck,
  Mic,
  Camera,
  Hand,
  Brain,
  Workflow,
  Music,
  FileText,
  Eye,
  Lock,
} from "lucide-react";
import type { PluginManifest } from "@/core/types";

const MOCK_PLUGINS: (PluginManifest & { icon: React.ReactNode; accentColor: string })[] = [
  {
    id: "com.zaraos.gesture-music",
    name: "Gesture Music Player",
    version: "1.2.0",
    developer: "ZaraOS Labs",
    description:
      "Control your local music library entirely through hand gestures and voice commands. No touch required.",
    category: "media",
    entryPoint: "dist/index.js",
    permissions: ["microphone", "files"],
    voiceCommands: ["play music", "next track", "pause", "skip song", "shuffle"],
    gestureCommands: ["SWIPE_RIGHT: next track", "SWIPE_LEFT: previous", "FIST: pause", "OPEN_PALM: play"],
    aiCapabilities: [],
    systemAccess: false,
    priceModel: "free",
    verified: true,
    sandboxRequired: true,
    status: "installed",
    icon: <Music className="w-5 h-5" />,
    accentColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
  },
  {
    id: "com.zaraos.file-summarizer",
    name: "Local File Summarizer",
    version: "0.9.1",
    developer: "ZaraOS Labs",
    description:
      "Summarize documents and folders using on-device AI. Supports PDF, DOCX, TXT, and Markdown. Nothing leaves your machine.",
    category: "ai",
    entryPoint: "dist/index.js",
    permissions: ["files", "local_ai"],
    voiceCommands: ["summarize this folder", "summarize document", "what is in this file", "extract key points"],
    gestureCommands: ["TWO_FINGERS_UP: summarize selected"],
    aiCapabilities: ["text-summarization", "document-qa"],
    systemAccess: false,
    priceModel: "free",
    verified: true,
    sandboxRequired: true,
    status: "available",
    icon: <FileText className="w-5 h-5" />,
    accentColor: "text-purple-400 border-purple-500/30 bg-purple-500/5",
  },
  {
    id: "com.zaraos.creator-workflow",
    name: "Creator Workflow Agent",
    version: "0.4.0",
    developer: "Third Party Developer",
    description:
      "Automates content creation workflows — caption generation, image tagging, batch file renaming, and social media scheduling from a single voice command.",
    category: "automation",
    entryPoint: "dist/index.js",
    permissions: ["files", "local_ai", "network"],
    voiceCommands: ["start creator workflow", "generate caption", "batch rename files", "tag images"],
    gestureCommands: ["OPEN_PALM: open workflow panel", "PINCH: confirm action"],
    aiCapabilities: ["text-generation", "image-captioning"],
    systemAccess: false,
    priceModel: "freemium",
    verified: false,
    sandboxRequired: true,
    status: "available",
    icon: <Workflow className="w-5 h-5" />,
    accentColor: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  },
  {
    id: "com.zaraos.privacy-monitor",
    name: "Privacy Monitor",
    version: "1.0.0",
    developer: "ZaraOS Labs",
    description:
      "Real-time overlay showing which apps, processes, and plugins are accessing hardware and network resources. Full transparency at a glance.",
    category: "system",
    entryPoint: "dist/index.js",
    permissions: ["system_actions"],
    voiceCommands: ["show privacy report", "what is running", "check privacy status", "show activity"],
    gestureCommands: ["TWO_FINGERS_UP: toggle privacy overlay"],
    aiCapabilities: [],
    systemAccess: true,
    priceModel: "free",
    verified: true,
    sandboxRequired: false,
    status: "available",
    icon: <Eye className="w-5 h-5" />,
    accentColor: "text-green-400 border-green-500/30 bg-green-500/5",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  media:      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  ai:         "bg-purple-500/10 text-purple-400 border-purple-500/20",
  automation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  system:     "bg-green-500/10 text-green-400 border-green-500/20",
  productivity:"bg-blue-500/10 text-blue-400 border-blue-500/20",
  voice:      "bg-pink-500/10 text-pink-400 border-pink-500/20",
  gesture:    "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const PERMISSION_ICONS: Partial<Record<string, React.ReactNode>> = {
  microphone:  <Mic className="w-3 h-3" />,
  camera:      <Camera className="w-3 h-3" />,
  local_ai:    <Brain className="w-3 h-3" />,
  files:       <FileText className="w-3 h-3" />,
  network:     <Code className="w-3 h-3" />,
  system_actions: <Terminal className="w-3 h-3" />,
};

const FULL_MANIFEST = `{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "developer": "Your Name",
  "description": "What your plugin does.",
  "category": "productivity",
  "entryPoint": "dist/index.js",
  "permissions": [
    "files",
    "local_ai"
  ],
  "voiceCommands": [
    "open my plugin",
    "start workflow",
    "summarize this"
  ],
  "gestureCommands": [
    "OPEN_PALM: activate",
    "PINCH: confirm",
    "SWIPE_RIGHT: next"
  ],
  "aiCapabilities": [
    "text-summarization"
  ],
  "skillDeclarations": [
    {
      "skillId": "com.example.my-plugin.summarize",
      "name": "Summarize Content",
      "voiceCommands": ["summarize this", "make it shorter"],
      "textCommands": ["summarize", "condense"],
      "requiresConfirmation": false,
      "dangerous": false
    }
  ],
  "systemAccess": false,
  "priceModel": "free",
  "verified": false,
  "sandboxRequired": true
}`;

export default function Developers() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8 h-full">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1 flex items-center gap-3">
              <Code className="w-8 h-8 text-primary" />
              Developer Portal
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              Extend ZaraOS with apps, plugins, AI skills, and gesture packs.
            </p>
          </div>
          <div className="text-right text-xs font-mono text-muted-foreground/60">
            <div>Plugin Spec v1.1</div>
            <div className="text-primary/60">Alpha 0.2</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
          {/* Plugin Registry */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-5 overflow-y-auto pr-1 pb-8">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 flex-shrink-0">
              <Boxes className="w-4 h-4 text-muted-foreground" />
              Plugin Registry
              <span className="text-xs font-mono text-muted-foreground/50 font-normal ml-1">
                {MOCK_PLUGINS.length} plugins
              </span>
            </h2>

            <div className="flex flex-col gap-4">
              {MOCK_PLUGINS.map((p) => (
                <Card
                  key={p.id}
                  className="bg-white border-slate-100 shadow-sm flex flex-col"
                  data-testid={`plugin-card-${p.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${p.accentColor}`}>
                          {p.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base leading-none">{p.name}</CardTitle>
                            {p.verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-green-400" aria-label="Verified by ZaraOS" />
                            )}
                            {p.status === "installed" && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-label="Installed" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground/50">{p.id}</span>
                            <span className="text-[10px] font-mono text-muted-foreground/40">v{p.version}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${CATEGORY_COLORS[p.category] ?? ""}`}
                        >
                          {p.category}
                        </Badge>
                        {p.priceModel !== "free" && (
                          <Badge variant="outline" className="text-[10px] font-mono text-amber-400 border-amber-500/20 bg-amber-500/5">
                            {p.priceModel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4 pt-0">
                    <p className="text-sm text-gray-300 leading-relaxed">{p.description}</p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Voice commands */}
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1">
                          <Mic className="w-3 h-3" /> Voice Commands
                        </div>
                        <div className="flex flex-col gap-1">
                          {p.voiceCommands.slice(0, 3).map((cmd) => (
                            <span key={cmd} className="text-[11px] font-mono bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-600">
                              "{cmd}"
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Gesture commands */}
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1">
                          <Hand className="w-3 h-3" /> Gesture Commands
                        </div>
                        <div className="flex flex-col gap-1">
                          {p.gestureCommands.slice(0, 3).map((cmd) => (
                            <span key={cmd} className="text-[11px] font-mono bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-600">
                              {cmd}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Permissions Required
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-muted-foreground"
                          >
                            {PERMISSION_ICONS[perm]}
                            {perm.replace("_", " ")}
                          </span>
                        ))}
                        {p.systemAccess && (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/5 text-red-400">
                            <Terminal className="w-3 h-3" /> system access
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4 border-t border-slate-100 gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/40 mr-auto">
                      by {p.developer}
                    </span>
                    {p.status === "installed" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500"
                        data-testid={`button-uninstall-${p.id}`}
                      >
                        Uninstall
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                        data-testid={`button-install-${p.id}`}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Install
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="col-span-1 flex flex-col gap-5 overflow-y-auto pb-8">
            {/* Manifest spec */}
            <Card className="bg-black border-primary/20 overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.05)]">
              <CardHeader className="bg-primary/5 border-b border-primary/15 py-3">
                <CardTitle className="text-xs font-mono text-primary/80 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" /> manifest.json — Full Spec
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="text-[11px] font-mono text-gray-300 p-4 overflow-x-auto leading-relaxed">
                  {FULL_MANIFEST}
                </pre>
              </CardContent>
            </Card>

            {/* Skill declarations info */}
            <div className="p-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400">Skill Declarations (v1.1)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plugins can declare Skills in their manifest. Each declared skill becomes
                available in the Zara Skills Hub and can be triggered by voice, text, or gesture.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                {[
                  "Declare voice + text commands",
                  "Set requiresConfirmation flag",
                  "Mark dangerous actions",
                  "Integrated into command router",
                  "Appears in Skills Hub",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-cyan-500/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Creator Assistant example skill */}
            <div className="p-4 rounded-xl border border-purple-500/15 bg-purple-500/5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-400">Example: Creator Assistant</span>
                <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">Third-party</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A third-party skill package that adds creator workflow capabilities to Zara:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                {[
                  "Summarize video scripts",
                  "Organize media files by project",
                  "Generate post captions with local AI",
                  "Schedule posts (requires social account)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-500/60" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] font-mono text-muted-foreground/40">
                All execution mocked in Alpha 0.2. Social account required for post scheduling.
              </p>
            </div>

            {/* Ecosystem preview */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <h3 className="font-bold text-slate-800 text-sm">Zara Store — Coming Soon</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ZaraOS will support a curated store for:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 font-mono">
                {[
                  "Zara apps",
                  "Plugins",
                  "AI skills",
                  "Gesture packs",
                  "Voice command packs",
                  "Automation workflows",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary/60" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary/70 hover:bg-primary/5 mt-1"
                data-testid="button-read-docs"
              >
                Read Plugin Spec
              </Button>
            </div>

            {/* Security note */}
            <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">Plugin Security</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All third-party plugins run in a sandbox with strict CSP. They cannot access API keys, user credentials, or undeclared hardware.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
