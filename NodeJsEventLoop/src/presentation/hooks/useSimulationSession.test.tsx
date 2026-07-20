// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { synchronousExecutionLesson } from "../../lessons/synchronousExecutionLesson";
import { timerOrderingLesson } from "../../lessons/timerOrderingLesson";
import { useSimulationSession } from "./useSimulationSession";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderSession = (): ReturnType<typeof renderHook<ReturnType<typeof useSimulationSession>, unknown>> =>
  renderHook(() => useSimulationSession(synchronousExecutionLesson), { wrapper: StrictMode });

describe("simulation session hook", () => {
  it("handles controls and resets progress when selecting a lesson", () => {
    const { result } = renderSession();
    act(() => { result.current.advance(); });
    expect(result.current.session.snapshotIndex).toBe(1);
    act(() => { result.current.rewind(); });
    expect(result.current.session.snapshotIndex).toBe(0);
    act(() => { result.current.advance(); });
    act(() => { result.current.reset(); });
    expect(result.current.session.snapshotIndex).toBe(0);
    act(() => { result.current.advance(); });
    act(() => { result.current.selectLesson(timerOrderingLesson); });
    expect(result.current.session.lesson).toBe(timerOrderingLesson);
    expect(result.current.session.snapshotIndex).toBe(0);
  });

  it("handles one transition per arrow key under StrictMode and prevents scrolling", () => {
    const { result } = renderSession();
    expect(fireEvent.keyDown(window, { key: "ArrowRight" })).toBe(false);
    expect(result.current.session.snapshotIndex).toBe(1);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(result.current.session.snapshotIndex).toBe(0);
  });

  it.each(["altKey", "ctrlKey", "metaKey", "shiftKey", "isComposing"])(
    "ignores arrow keys with %s",
    (modifier) => {
      const { result } = renderSession();
      fireEvent.keyDown(window, { key: "ArrowRight", [modifier]: true });
      expect(result.current.session.snapshotIndex).toBe(0);
    },
  );

  it.each(["input", "textarea", "select"])("preserves arrow keys in %s", (tagName) => {
    const { result } = renderSession();
    const input = document.createElement(tagName);
    document.body.append(input);
    try {
      expect(fireEvent.keyDown(input, { key: "ArrowRight" })).toBe(true);
      expect(result.current.session.snapshotIndex).toBe(0);
    } finally {
      input.remove();
    }
  });

  it("ignores an event already handled by another control", () => {
    const { result } = renderSession();
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
    event.preventDefault();
    fireEvent(window, event);
    expect(result.current.session.snapshotIndex).toBe(0);
  });

  it("removes the keyboard listener on unmount", () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderSession();
    unmount();
    const keyboardRegistrations = addListener.mock.calls.filter(([type]) => type === "keydown");
    expect(keyboardRegistrations.length).toBeGreaterThan(0);
    for (const [type, listener] of keyboardRegistrations) {
      expect(removeListener).toHaveBeenCalledWith(type, listener);
    }
  });
});
