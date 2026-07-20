import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { RuntimeToken } from "../../domain/simulation/types";

export const useRuntimeTokenAnimation = (snapshotId: string, tokens: readonly RuntimeToken[]): RefObject<HTMLElement | null> => {
  const diagramRef = useRef<HTMLElement>(null);
  const previousPositions = useRef(new Map<string, { left: number; top: number }>());

  useLayoutEffect(() => {
    const elements = diagramRef.current?.querySelectorAll<HTMLElement>("[data-token-id]") ?? [];
    const nextPositions = new Map<string, { left: number; top: number }>();
    const animations: Animation[] = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const element of elements) {
      const id = element.dataset["tokenId"];
      if (id === undefined) continue;
      const bounds = element.getBoundingClientRect();
      const position = { left: bounds.left + window.scrollX, top: bounds.top + window.scrollY };
      nextPositions.set(id, position);
      const previous = previousPositions.current.get(id);
      if (reduceMotion) continue;
      if (previous && (Math.abs(previous.left - position.left) > 1 || Math.abs(previous.top - position.top) > 1)) {
        animations.push(element.animate([
          { transform: `translate(${String(previous.left - position.left)}px, ${String(previous.top - position.top)}px)`, zIndex: 10 },
          { transform: "translate(0, 0)", zIndex: 10 },
        ], { duration: 560, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }));
      } else if (!previous) {
        animations.push(element.animate([
          { opacity: 0, transform: "translateY(-12px) scale(0.96)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ], { duration: 320, easing: "ease-out" }));
      }
    }
    previousPositions.current = nextPositions;
    return () => { animations.forEach((animation) => { animation.cancel(); }); };
  }, [snapshotId, tokens]);

  return diagramRef;
};
