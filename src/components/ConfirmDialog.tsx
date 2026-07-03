import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    setOpen(false);
    resolver.current?.(result);
    resolver.current = null;
  }

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => !o && settle(false)}>
        <AlertDialogContent className="border-[color:var(--border)] duration-200 ease-out data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl font-medium text-[color:var(--ink)]">
              {options?.title}
            </AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription className="text-[color:var(--muted-navy)]">
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => settle(false)}
              className="press mt-2 rounded-[4px] border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--mid-navy)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97] sm:mt-0"
              style={{ borderColor: "var(--border)" }}
            >
              {options?.cancelLabel ?? "Cancel"}
            </button>
            <button
              onClick={() => settle(true)}
              className="press rounded-[4px] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all active:scale-[0.97]"
              style={{ backgroundColor: options?.destructive ? "var(--danger)" : "var(--royal)" }}
            >
              {options?.confirmLabel ?? "Confirm"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
