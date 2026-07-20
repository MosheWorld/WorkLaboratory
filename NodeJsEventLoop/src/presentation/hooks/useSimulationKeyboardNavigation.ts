import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { advanceSimulation, rewindSimulation } from "../../domain/simulation/simulationSession";
import type { SimulationSession } from "../../domain/simulation/types";

export const useSimulationKeyboardNavigation = (
  setSession: Dispatch<SetStateAction<SimulationSession>>,
): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || target.closest("input, textarea, select, [role='slider'], [role='textbox']") !== null
      )) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        setSession(event.key === "ArrowRight" ? advanceSimulation : rewindSimulation);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); };
  }, [setSession]);
};
