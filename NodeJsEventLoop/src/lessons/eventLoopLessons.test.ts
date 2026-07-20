import { describe, expect, it } from "vitest";
import { eventLoopLessons } from "./eventLoopLessons";

describe("lesson catalog integrity", () => {
  it("contains lessons with unique identities", () => {
    expect(eventLoopLessons.length).toBeGreaterThan(0);
    expect(new Set(eventLoopLessons.map((lesson) => lesson.id)).size).toBe(eventLoopLessons.length);
  });

  for (const lesson of eventLoopLessons) {
    it(`${lesson.id} has valid source references and unique render keys`, () => {
      expect(lesson.snapshots.length).toBeGreaterThan(0);
      expect(new Set(lesson.snapshots.map((snapshot) => snapshot.id)).size).toBe(lesson.snapshots.length);

      for (const snapshot of lesson.snapshots) {
        expect(Number.isInteger(snapshot.activeLineNumber)).toBe(true);
        expect(snapshot.activeLineNumber).toBeGreaterThanOrEqual(1);
        expect(snapshot.activeLineNumber).toBeLessThanOrEqual(lesson.sourceCode.length);
        expect(new Set(snapshot.tokens.map((token) => token.id)).size).toBe(snapshot.tokens.length);
        expect(new Set(snapshot.consoleEntries.map((entry) => entry.id)).size).toBe(snapshot.consoleEntries.length);
      }
    });
  }
});
