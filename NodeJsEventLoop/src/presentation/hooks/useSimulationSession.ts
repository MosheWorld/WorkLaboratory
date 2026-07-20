import { useState } from "react";
import {
  advanceSimulation,
  canAdvanceSimulation,
  canRewindSimulation,
  createSimulationSession,
  resetSimulation,
  rewindSimulation,
  selectCurrentSnapshot,
} from "../../domain/simulation/simulationSession";
import type { LessonDefinition, SimulationSession, SimulationSnapshot } from "../../domain/simulation/types";
import { useSimulationKeyboardNavigation } from "./useSimulationKeyboardNavigation";

interface SimulationSessionControls {
  readonly session: SimulationSession;
  readonly snapshot: SimulationSnapshot;
  readonly canAdvance: boolean;
  readonly canRewind: boolean;
  readonly advance: () => void;
  readonly rewind: () => void;
  readonly reset: () => void;
  readonly selectLesson: (lesson: LessonDefinition) => void;
}

export const useSimulationSession = (initialLesson: LessonDefinition): SimulationSessionControls => {
  const [session, setSession] = useState(() => createSimulationSession(initialLesson));

  useSimulationKeyboardNavigation(setSession);

  return {
    session,
    snapshot: selectCurrentSnapshot(session),
    canAdvance: canAdvanceSimulation(session),
    canRewind: canRewindSimulation(session),
    advance: () => { setSession(advanceSimulation); },
    rewind: () => { setSession(rewindSimulation); },
    reset: () => { setSession(resetSimulation); },
    selectLesson: (lesson) => { setSession(createSimulationSession(lesson)); },
  };
};
