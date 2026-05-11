import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  MessageSquare, 
  Terminal, 
  LayoutGrid, 
  FolderOpen, 
  PlaySquare, 
  Settings, 
  ShieldAlert, 
  Cpu, 
  Code 
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/assistant", icon: MessageSquare, label: "Assistant" },
    { href: "/console", icon: Terminal, label: "Console" },
    { href: "/apps", icon: LayoutGrid, label: "Apps" },
    { href: "/files", icon: FolderOpen, label: "Files" },
    { href: "/media", icon: PlaySquare, label: "Media" },
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/privacy", icon: ShieldAlert, label: "Privacy" },
    { href: "/ai-providers", icon: Cpu, label: "AI Providers" },
    { href: "/developers", icon: Code, label: "Developers" },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-border bg-card flex flex-col justify-between items-center md:items-stretch py-6 flex-shrink-0 z-10 shadow-xl shadow-cyan-900/5">
        <div className="flex flex-col items-center md:items-start w-full px-0 md:px-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="font-mono font-bold text-primary-foreground text-xl">Z</span>
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold text-xl tracking-tight text-white">ZaraOS</h1>
              <p className="text-[10px] text-primary/80 font-mono tracking-widest uppercase">Alpha 0.1</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2 w-full">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                    className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg cursor-pointer transition-all duration-300 group
                      ${isActive 
                        ? "bg-primary/10 text-primary border border-primary/30 shadow-[inset_0_0_12px_rgba(0,240,255,0.1)]" 
                        : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" : ""}`} />
                    <span className="hidden md:block font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-0 md:px-6 flex flex-col items-center md:items-start gap-4">
          <div className="w-full h-px bg-border my-2"></div>
          <div className="flex flex-col gap-1 w-full text-center md:text-left">
            <span className="text-xs text-muted-foreground font-mono hidden md:block">SYSTEM STATUS</span>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <span className="text-sm font-medium hidden md:block">Optimal</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-background/95">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none -z-10"></div>
        <div className="flex-1 overflow-y-auto p-6 md:p-10 z-0">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
