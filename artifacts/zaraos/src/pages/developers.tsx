import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Terminal, Boxes, Download, CheckCircle2 } from "lucide-react";

export default function Developers() {
  const plugins = [
    {
      name: "Docker Containers",
      id: "zara-plugin-docker",
      desc: "Manage and monitor local Docker containers via voice and terminal.",
      status: "installed",
      perms: ["System Access", "Network"],
      voiceCmds: ["'List containers'", "'Stop database'"],
    },
    {
      name: "Git Toolkit",
      id: "zara-plugin-git",
      desc: "Advanced source control integration with visual diffs.",
      status: "available",
      perms: ["File System"],
      voiceCmds: ["'Commit changes'", "'Switch to main branch'"],
    },
    {
      name: "Home Assistant",
      id: "zara-plugin-iot",
      desc: "Bridge ZaraOS with your local smart home network.",
      status: "available",
      perms: ["Network (Local)"],
      voiceCmds: ["'Turn off lights'", "'Set temp to 72'"],
    }
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8 h-full">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Code className="w-10 h-10 text-pink-400" />
            Developer Portal
          </h1>
          <p className="text-muted-foreground font-mono text-sm">Extend ZaraOS with custom plugins and workflows.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
          
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2 pb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-muted-foreground" /> Plugin Registry
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plugins.map(p => (
                <Card key={p.id} className="bg-card/40 border-white/5 backdrop-blur flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      {p.status === "installed" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">{p.id}</div>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-300 flex-1">
                    {p.desc}
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Example Voice Commands</div>
                      <div className="flex flex-wrap gap-2">
                        {p.voiceCmds.map(cmd => (
                          <span key={cmd} className="text-xs font-mono bg-black/50 border border-white/10 px-2 py-1 rounded">{cmd}</span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-white/5">
                    {p.status === "installed" ? (
                      <Button variant="outline" className="w-full border-white/10 text-red-400 hover:bg-red-500/10 hover:text-red-400">Uninstall</Button>
                    ) : (
                      <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white"><Download className="w-4 h-4 mr-2" /> Install Plugin</Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          <div className="col-span-1 flex flex-col gap-6">
            <Card className="bg-black border-pink-500/30 overflow-hidden shadow-[0_0_30px_rgba(236,72,153,0.1)]">
              <CardHeader className="bg-pink-950/30 border-b border-pink-500/20 pb-3">
                <CardTitle className="text-sm font-mono text-pink-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> manifest.json
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="text-xs font-mono text-gray-300 p-4 overflow-x-auto leading-relaxed">
{`{
  "name": "My Custom Plugin",
  "version": "1.0.0",
  "permissions": [
    "filesystem:read",
    "network:local"
  ],
  "intents": {
    "voice": [
      {
        "trigger": "deploy site",
        "action": "scripts/deploy.sh"
      }
    ],
    "gesture": [
      {
        "type": "TWO_FINGERS_UP",
        "action": "system:toggle_terminal"
      }
    ]
  }
}`}
                </pre>
              </CardContent>
            </Card>

            <div className="p-4 rounded-xl border border-white/5 bg-card/20 backdrop-blur">
              <h3 className="font-bold text-white mb-2 text-sm">Build Your Own</h3>
              <p className="text-xs text-muted-foreground mb-4">ZaraOS architecture uses a secure sandbox for third-party execution. Plugins communicate via IPC with strict permission boundaries.</p>
              <Button variant="outline" className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10">Read Documentation</Button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
