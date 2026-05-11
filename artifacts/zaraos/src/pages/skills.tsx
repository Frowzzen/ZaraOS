import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useRuntime } from "@/core/runtime-context";
import { skillRuntime } from "@/core/skills/skill-runtime";
import {
  SKILL_CATEGORY_META,
  SKILL_STATUS_META,
} from "@/core/skills/types";
import type { ZaraSkill, SkillCategory } from "@/core/skills/types";
import {
  Search,
  Zap,
  Mic,
  Camera,
  Wifi,
  FolderOpen,
  Cpu,
  Cloud,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  LayoutGrid,
} from "lucide-react";

const ALL_CATEGORIES = Object.keys(SKILL_CATEGORY_META) as SkillCategory[];
const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  microphone: <Mic className="w-3 h-3" />,
  camera: <Camera className="w-3 h-3" />,
  network: <Wifi className="w-3 h-3" />,
  files: <FolderOpen className="w-3 h-3" />,
  local_ai: <Cpu className="w-3 h-3" />,
  cloud_ai: <Cloud className="w-3 h-3" />,
  system_actions: <Zap className="w-3 h-3" />,
};

function SkillCard({ skill, onExecute }: { skill: ZaraSkill; onExecute: (skill: ZaraSkill) => void }) {
  const categoryMeta = SKILL_CATEGORY_META[skill.category];
  const statusMeta = SKILL_STATUS_META[skill.status];

  return (
    <Card
      className={`bg-card/40 border-white/5 backdrop-blur hover:border-white/10 transition-all duration-200 group ${
        !skill.enabled ? "opacity-50" : ""
      }`}
      data-testid={`skill-card-${skill.id}`}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusMeta.color} ${statusMeta.bg} ${statusMeta.border}`}>
                {skill.status === "built_in" && <CheckCircle2 className="w-2.5 h-2.5" />}
                {skill.status === "mocked" && <Clock className="w-2.5 h-2.5" />}
                {statusMeta.label}
              </span>
              {/* Dangerous badge */}
              {skill.dangerous && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border text-red-400 bg-red-500/10 border-red-500/25">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Dangerous
                </span>
              )}
              {/* Confirmation badge */}
              {skill.requiresConfirmation && !skill.dangerous && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/25">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Confirm
                </span>
              )}
            </div>
            <h3 className="font-bold text-white text-sm leading-tight">{skill.name}</h3>
          </div>
          {/* Category pill */}
          <span className={`flex-shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border ${categoryMeta.color} ${categoryMeta.bgColor} ${categoryMeta.borderColor}`}>
            {categoryMeta.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {skill.description}
        </p>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex flex-col gap-3">
        {/* Local / Cloud indicator */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className={`flex items-center gap-1 ${skill.localFirst ? "text-green-400" : "text-muted-foreground"}`}>
            <Cpu className="w-3 h-3" />
            {skill.localFirst ? "Local-first" : "Requires network"}
          </span>
          {skill.cloudOptional && (
            <span className="flex items-center gap-1 text-slate-400">
              <Cloud className="w-3 h-3" />
              Cloud optional
            </span>
          )}
          {skill.providerRequired && (
            <span className="flex items-center gap-1 text-amber-400">
              <Cloud className="w-3 h-3" />
              {skill.providerRequired}
            </span>
          )}
        </div>

        {/* Permissions */}
        {skill.permissions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wide mr-0.5">Needs:</span>
            {skill.permissions.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-muted-foreground"
              >
                {PERMISSION_ICONS[perm]}
                {perm.replace("_", " ")}
              </span>
            ))}
          </div>
        )}

        {/* Voice commands */}
        {skill.voiceCommands.length > 0 && (
          <div>
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wide mb-1">Voice</p>
            <div className="flex flex-col gap-0.5">
              {skill.voiceCommands.slice(0, 2).map((cmd) => (
                <code key={cmd} className="text-[11px] text-primary/70 bg-primary/5 rounded px-1.5 py-0.5 font-mono leading-relaxed">
                  "{cmd}"
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Gesture support */}
        {skill.gestureCommands.length > 0 && (
          <div>
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wide mb-1">Gesture</p>
            <p className="text-[11px] text-purple-400/80 font-mono">{skill.gestureCommands[0]}</p>
          </div>
        )}

        {/* Execute button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExecute(skill)}
          disabled={!skill.enabled || skill.status === "future"}
          className={`w-full mt-1 text-xs font-medium border transition-all duration-200 ${
            skill.status === "future"
              ? "border-white/8 text-muted-foreground/40 cursor-not-allowed"
              : skill.dangerous
              ? "border-red-500/20 text-red-400/70 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/8"
              : "border-primary/15 text-primary/60 hover:border-primary/35 hover:text-primary hover:bg-primary/8"
          }`}
        >
          <Play className="w-3 h-3 mr-1.5" />
          {skill.status === "future" ? "Coming Soon" : skill.requiresConfirmation ? "Execute (needs confirm)" : "Execute"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Skills() {
  const { executeSkill } = useRuntime();
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSkill, setPendingSkill] = useState<ZaraSkill | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const stats = skillRuntime.getStats();

  // Filter skills
  const filteredSkills = (() => {
    let skills = skillRuntime.listSkills();
    if (selectedCategory !== "all") {
      skills = skills.filter((s) => s.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.voiceCommands.some((c) => c.toLowerCase().includes(q)) ||
          s.textCommands.some((c) => c.toLowerCase().includes(q))
      );
    }
    return skills;
  })();

  const handleExecute = (skill: ZaraSkill) => {
    if (skill.requiresConfirmation || skill.dangerous) {
      setPendingSkill(skill);
    } else {
      runSkill(skill, false);
    }
  };

  const runSkill = async (skill: ZaraSkill, confirmed: boolean) => {
    setPendingSkill(null);
    const result = await executeSkill(skill.id, skill.textCommands[0] ?? skill.name, "keyboard", confirmed);
    setLastResult(result.response);
    setTimeout(() => setLastResult(null), 4000);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6 h-full">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Zap className="w-9 h-9 text-primary" />
              Zara Skills Hub
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              Every capability Zara can perform — built-in, mocked, and coming soon.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm font-mono">
            <div className="text-center">
              <div className="text-white font-bold text-lg">{stats.total}</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Total</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-bold text-lg">{stats.builtIn}</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Built-in</div>
            </div>
            <div className="text-center">
              <div className="text-amber-400 font-bold text-lg">{stats.mocked}</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Mocked</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 font-bold text-lg">{stats.future}</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Planned</div>
            </div>
          </div>
        </div>

        {/* Last result banner */}
        {lastResult && (
          <div className="flex items-start gap-3 bg-primary/8 border border-primary/20 rounded-lg px-4 py-3 animate-in fade-in duration-200">
            <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white font-mono">{lastResult}</p>
          </div>
        )}

        {/* Search + Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              placeholder="Search skills by name, description, or voice command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/40 border-white/10 text-white placeholder:text-muted-foreground/40 font-mono text-sm"
              data-testid="skill-search"
            />
          </div>
        </div>

        {/* Category filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className={`text-xs font-mono border transition-all ${
              selectedCategory === "all"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/8 text-muted-foreground hover:text-white hover:border-white/15"
            }`}
            data-testid="category-all"
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
            All ({stats.total})
          </Button>
          {ALL_CATEGORIES.map((cat) => {
            const meta = SKILL_CATEGORY_META[cat];
            const count = skillRuntime.getSkillsByCategory(cat).length;
            return (
              <Button
                key={cat}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-mono border transition-all ${
                  selectedCategory === cat
                    ? `${meta.borderColor} ${meta.bgColor} ${meta.color}`
                    : "border-white/8 text-muted-foreground hover:text-white hover:border-white/15"
                }`}
                data-testid={`category-${cat}`}
              >
                {meta.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Skill Grid */}
        {filteredSkills.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-mono text-sm">No skills match "{searchQuery}"</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
            {filteredSkills.map((skill, i) => (
              <div
                key={skill.id}
                className="animate-in fade-in slide-in-from-bottom-3 duration-300"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <SkillCard skill={skill} onExecute={handleExecute} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={pendingSkill !== null}
        onCancel={() => setPendingSkill(null)}
        onConfirm={() => pendingSkill && runSkill(pendingSkill, true)}
        skillName={pendingSkill?.name}
        reason={pendingSkill?.confirmationReason}
        dangerous={pendingSkill?.dangerous ?? false}
      />
    </Layout>
  );
}
