import { useState, useCallback } from "react";

export function useConfirmDialog<T = unknown>() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<T | null>(null);
  const ask = useCallback((t: T) => {
    setTarget(t);
    setOpen(true);
  }, []);
  const cancel = useCallback(() => {
    setOpen(false);
    setTarget(null);
  }, []);
  return { open, setOpen, target, setTarget, ask, cancel };
}
