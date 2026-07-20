import { describe, expect, it } from "vitest";
import { synchronousExecutionLesson } from "../../lessons/synchronousExecutionLesson";
import {
  advanceSimulation,
  canAdvanceSimulation,
  canRewindSimulation,
  createSimulationSession,
  resetSimulation,
  rewindSimulation,
  selectCurrentSnapshot,
} from "./simulationSession";

describe("simulation navigation", () => {
  it("starts at the first snapshot and cannot rewind", () => {
    const session = createSimulationSession(synchronousExecutionLesson);
    expect(selectCurrentSnapshot(session)).toBe(synchronousExecutionLesson.snapshots[0]);
    expect(canRewindSimulation(session)).toBe(false);
    expect(rewindSimulation(session)).toBe(session);
    expect(resetSimulation(session)).toBe(session);
  });

  it("advances and rewinds without mutating previous state", () => {
    const initial = createSimulationSession(synchronousExecutionLesson);
    const advanced = advanceSimulation(initial);
    expect(initial.snapshotIndex).toBe(0);
    expect(advanced.snapshotIndex).toBe(1);
    expect(canRewindSimulation(advanced)).toBe(true);
    expect(rewindSimulation(advanced)).toEqual(initial);
    expect(resetSimulation(advanced)).toEqual(initial);
  });

  it("stops at the last snapshot and preserves state identity", () => {
    const session = {
      lesson: synchronousExecutionLesson,
      snapshotIndex: synchronousExecutionLesson.snapshots.length - 1,
    };
    expect(canAdvanceSimulation(session)).toBe(false);
    expect(advanceSimulation(session)).toBe(session);
    expect(selectCurrentSnapshot(session)).toBe(synchronousExecutionLesson.snapshots.at(-1));
  });

  it("rejects an empty lesson before creating invalid state", () => {
    expect(() => createSimulationSession({ ...synchronousExecutionLesson, snapshots: [] }))
      .toThrow("must include at least one snapshot");
  });

  it("reports an invalid snapshot index", () => {
    expect(() => selectCurrentSnapshot({ lesson: synchronousExecutionLesson, snapshotIndex: -1 }))
      .toThrow("unavailable snapshot");
  });
});
