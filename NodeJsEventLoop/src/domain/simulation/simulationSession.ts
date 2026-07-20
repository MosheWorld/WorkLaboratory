import type { LessonDefinition, SimulationSession, SimulationSnapshot } from "./types";

export const createSimulationSession = (lesson: LessonDefinition): SimulationSession => {
  if (lesson.snapshots.length === 0) {
    throw new Error(`Lesson "${lesson.id}" must include at least one snapshot.`);
  }

  return { lesson, snapshotIndex: 0 };
};

export const selectCurrentSnapshot = (session: SimulationSession): SimulationSnapshot => {
  const currentSnapshot = session.lesson.snapshots[session.snapshotIndex];

  if (currentSnapshot === undefined) {
    throw new Error("The simulation session points to an unavailable snapshot.");
  }

  return currentSnapshot;
};

export const advanceSimulation = (session: SimulationSession): SimulationSession =>
  canAdvanceSimulation(session) ? { ...session, snapshotIndex: session.snapshotIndex + 1 } : session;

export const rewindSimulation = (session: SimulationSession): SimulationSession =>
  canRewindSimulation(session) ? { ...session, snapshotIndex: session.snapshotIndex - 1 } : session;

export const resetSimulation = (session: SimulationSession): SimulationSession =>
  session.snapshotIndex === 0 ? session : { ...session, snapshotIndex: 0 };

export const canAdvanceSimulation = (session: SimulationSession): boolean =>
  session.snapshotIndex < session.lesson.snapshots.length - 1;

export const canRewindSimulation = (session: SimulationSession): boolean => session.snapshotIndex > 0;
