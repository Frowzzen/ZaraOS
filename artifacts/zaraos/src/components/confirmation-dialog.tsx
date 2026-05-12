// ============================================================
// ZaraOS Confirmation Dialog
//
// Shown whenever Zara wants to execute an action that is:
//   - dangerous: true (irreversible)
//   - requiresConfirmation: true (transmits data, modifies state)
//
// SECURITY:
//   - No real action is taken until the user confirms.
//   - In Alpha 0.1/0.2, all confirmed actions are still mocked.
//   - The dialog never displays personal content (email body, file
//     contents, etc.) — only the skill name and reason.
//   - Cancel is always available and is the default focus.
// ============================================================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, Info } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  skillName?: string;
  skillId?: string;
  reason?: string;
  dangerous?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  skillName = "This action",
  reason,
  dangerous = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        className={`max-w-md bg-card border ${
          dangerous ? "border-red-500/30" : "border-primary/20"
        } shadow-2xl`}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            {dangerous ? (
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle className="text-slate-800 text-base font-bold leading-tight">
                Confirm Action
              </DialogTitle>
              {dangerous && (
                <span className="inline-block mt-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/25 rounded px-1.5 py-0.5">
                  Dangerous
                </span>
              )}
            </div>
          </div>

          <DialogDescription asChild>
            <div className="flex flex-col gap-3 mt-2">
              <div className="text-sm text-slate-800 font-medium">{skillName}</div>
              {reason && (
                <div className={`flex items-start gap-2 rounded-lg p-3 ${
                  dangerous
                    ? "bg-red-500/8 border border-red-500/15"
                    : "bg-primary/8 border border-primary/15"
                }`}>
                  <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${dangerous ? "text-red-400" : "text-primary"}`} />
                  <p className="text-sm text-muted-foreground leading-relaxed">{reason}</p>
                </div>
              )}
              {dangerous && (
                <p className="text-xs text-red-400/80 font-mono">
                  This action may be irreversible. Zara cannot undo it after confirmation.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="flex-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-muted-foreground hover:text-slate-900"
            autoFocus
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 font-semibold ${
              dangerous
                ? "bg-red-600 hover:bg-red-700 text-white border-0"
                : "bg-primary hover:bg-primary/90 text-primary-foreground border-0"
            }`}
          >
            {dangerous ? "Confirm Anyway" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
