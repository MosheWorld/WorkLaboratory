// @vitest-environment jsdom
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventLoopLessons } from "../lessons/eventLoopLessons";
import { App } from "./App";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("lesson application", () => {
  it("keeps button and keyboard navigation synchronized with progress", () => {
    render(<StrictMode><App /></StrictMode>);
    const progress = screen.getByRole("progressbar");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Previous" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next transition" }));
    expect(progress.getAttribute("aria-valuenow")).toBe("2");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
  });

  it("renders every lesson and resets its progress", () => {
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Learning steps" });
    const buttons = within(navigation).getAllByRole("button");
    for (const [index, button] of buttons.entries()) {
      const lesson = eventLoopLessons[index];
      if (lesson === undefined) throw new Error("Every navigation button must have a lesson");
      fireEvent.click(button);
      expect(screen.getByRole("heading", { name: lesson.title, level: 2 })).toBeDefined();
      expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
      fireEvent.click(screen.getByRole("button", { name: "Next transition" }));
      expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    }
  });

  it("preserves the runtime within a lesson and remounts it between lessons", () => {
    render(<App />);
    const runtime = screen.getByRole("region", { name: "Node.js event loop visualization" });
    fireEvent.click(screen.getByRole("button", { name: "Next transition" }));
    expect(screen.getByRole("region", { name: "Node.js event loop visualization" })).toBe(runtime);
    const navigation = screen.getByRole("navigation", { name: "Learning steps" });
    const nextLesson = within(navigation).getAllByRole("button").at(1);
    if (nextLesson === undefined) throw new Error("Expected a second lesson");
    fireEvent.click(nextLesson);
    expect(screen.getByRole("region", { name: "Node.js event loop visualization" })).not.toBe(runtime);
  });
});
