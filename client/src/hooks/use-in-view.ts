import { useEffect, useRef, useState } from "react";

export interface UseInViewOptions extends IntersectionObserverInit {
  /**
   * If true, mark inView permanently after first intersection.
   * This avoids re-renders when scrolling back out — ideal for lazy charts.
   */
  fireOnce?: boolean;
  /**
   * Optional callback invoked each time the intersection state changes.
   */
  onChange?: (inView: boolean, entry: IntersectionObserverEntry) => void;
}

/**
 * Observe a ref and return whether its element is currently intersecting
 * the viewport (plus rootMargin look-ahead for pre-rendering just-in-time).
 *
 *   const { ref, inView } = useInView({ fireOnce: true });
 *   return <div ref={ref}>{inView ? <Chart /> : <Skeleton />}</div>
 */
export function useInView({
  fireOnce = true,
  threshold = 0.15,
  rootMargin = "0px 0px 180px 0px",
  root,
  onChange,
}: UseInViewOptions = {}) {
  const [inView, setInView] = useState(false);
  const observedOnce = useRef(false);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      !("IntersectionObserver" in window)
    ) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const next = entry.isIntersecting;
          if (onChange) onChange(next, entry);

          if (next && fireOnce && !observedOnce.current) {
            observedOnce.current = true;
            setInView(true);
            observer.disconnect();
            return;
          }
          if (!fireOnce) setInView(next);
        }
      },
      { root: root ?? null, rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fireOnce, threshold, rootMargin, root, onChange]);

  return { ref: targetRef as React.RefObject<HTMLElement>, inView };
}
