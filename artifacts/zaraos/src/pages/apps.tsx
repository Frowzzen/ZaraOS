import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Globe, FolderOpen, FileText, PlaySquare, Settings, ShieldAlert, Cpu, Code, Zap } from "lucide-react";

export default function Apps() {
  const apps = [
    { name: "Browser",     icon: Globe,       path: "/apps",         color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20"   },
    { name: "Files",       icon: FolderOpen,  path: "/files",        color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
    { name: "Documents",   icon: FileText,    path: "/apps",         color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
    { name: "Media",       icon: PlaySquare,  path: "/media",        color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { name: "Settings",    icon: Settings,    path: "/settings",     color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/20"   },
    { name: "Privacy",     icon: ShieldAlert, path: "/privacy",      color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
    { name: "AI Config",   icon: Cpu,         path: "/ai-providers", color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/20"    },
    { name: "Dev Portal",  icon: Code,        path: "/developers",   color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20"   },
    { name: "Skills Hub",  icon: Zap,         path: "/skills",       color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20"   },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8 h-full">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Applications</h1>
          <p className="text-muted-foreground font-mono text-sm">System modules and installed packages</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {apps.map((app, index) => (
            <Link key={app.name} href={app.path}>
              <Card
                className={`cursor-pointer bg-card/40 backdrop-blur border-white/5 hover:${app.border} transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-900/10 animate-in fade-in slide-in-from-bottom-4`}
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`app-tile-${app.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8 flex flex-col items-center justify-center gap-4 text-center">
                  <div className={`w-16 h-16 rounded-2xl ${app.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <app.icon className={`w-8 h-8 ${app.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{app.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Launch Module</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
