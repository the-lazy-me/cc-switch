import { useEffect, useRef, useState, type RefObject } from "react";

function getContentWidth(el: HTMLDivElement): number {
  // Prefer measuring the first child (actual toolbar content width) because
  // when the container uses `justify-end`, overflow can happen on the left
  // and `el.scrollWidth` may still equal `el.clientWidth`.
  const contentEl = el.firstElementChild as HTMLElement | null;
  if (contentEl) {
    return Math.ceil(contentEl.getBoundingClientRect().width);
  }
  return Math.ceil(el.scrollWidth);
}

/**
 * Detects whether the container's children overflow the available width
 * and returns a `compact` flag for the AppSwitcher.
 *
 * Uses ResizeObserver on a flex-constrained container. The container
 * must have `flex-1 min-w-0 overflow-hidden` so its width is determined
 * by the parent layout, not its own content — avoiding the oscillation
 * problem when toggling compact mode. We also observe the first child to
 * catch content-width-only changes (e.g. different font metrics on Windows).
 */
export function useAutoCompact(
  containerRef: RefObject<HTMLDivElement | null>,
): boolean {
  const [compact, setCompact] = useState(false);
  const normalWidthRef = useRef(0);
  const lockUntilRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const evaluateCompact = () => {
      // During expand animation, ignore resize events to prevent flicker
      if (Date.now() < lockUntilRef.current) return;

      const contentWidth = getContentWidth(el);

      if (!compact) {
        // Cache the total content width in normal mode
        normalWidthRef.current = contentWidth;
        // Overflow detected → switch to compact
        if (contentWidth > el.clientWidth + 1) {
          setCompact(true);
        }
      } else if (normalWidthRef.current > 0) {
        // In compact mode: only recover to normal if
        // available space >= what normal mode needed
        if (el.clientWidth >= normalWidthRef.current) {
          // Lock out resize events during the expand animation (200ms + 50ms margin)
          lockUntilRef.current = Date.now() + 250;
          setCompact(false);
        }
      }
    };

    const ro = new ResizeObserver(evaluateCompact);
    ro.observe(el);

    const contentEl = el.firstElementChild as HTMLElement | null;
    if (contentEl) {
      ro.observe(contentEl);
    }

    evaluateCompact();
    return () => ro.disconnect();
  }, [compact]);

  return compact;
}
