import { useState, useCallback } from "react";

export function useDisclosure(initial: boolean = false) {
  const [open, setOpen] = useState<boolean>(initial);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return { open, setOpen, onOpen, onClose, toggle };
}
