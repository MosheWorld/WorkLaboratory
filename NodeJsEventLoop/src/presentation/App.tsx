import { useSimulationSession } from "./hooks/useSimulationSession";
import { eventLoopLessons } from "../lessons/eventLoopLessons";
import { CodePanel } from "./components/CodePanel";
import { ConsolePanel } from "./components/ConsolePanel";
import { LessonStepNavigation } from "./components/LessonStepNavigation";
import { LessonSummary } from "./components/LessonSummary";
import { RuntimeDiagram } from "./components/RuntimeDiagram";
import { SimulationControls } from "./components/SimulationControls";

const firstLesson = eventLoopLessons[0];

if (firstLesson === undefined) {
  throw new Error("The lesson catalog must include at least one lesson.");
}

export const App = (): React.JSX.Element => {
  const { session, snapshot, canAdvance, canRewind, advance, rewind, reset, selectLesson } =
    useSimulationSession(firstLesson);
  const isCompleteRuntimeLesson = session.lesson.focus === "complete-runtime";

  return (
    <main className={isCompleteRuntimeLesson ? "application-shell complete-runtime-lesson" : "application-shell"}>
      <header className="hero">
        <h1>Event Loop Lab</h1>
        <p className="hero-description">
          Run the runtime one transition at a time. Watch each callback earn its turn.
        </p>
      </header>

      <LessonStepNavigation
        activeLessonId={session.lesson.id}
        lessons={eventLoopLessons}
        onLessonSelected={selectLesson}
      />

      <LessonSummary lesson={session.lesson} snapshotIndex={session.snapshotIndex} />

      <section className="lab-grid" aria-label="Event loop simulation">
        <CodePanel
          activeLineNumber={snapshot.activeLineNumber}
          sourceCode={session.lesson.sourceCode}
          followActiveLine={isCompleteRuntimeLesson}
        />
        <RuntimeDiagram
          key={session.lesson.id}
          activeCycleStage={snapshot.activeCycleStage}
          activePhase={snapshot.activePhase}
          focus={session.lesson.focus}
          snapshotId={snapshot.id}
          tokens={snapshot.tokens}
          transitionTitle={snapshot.transitionTitle}
        />
        <ConsolePanel entries={snapshot.consoleEntries} />
      </section>

      <section className="explanation-card" key={snapshot.id} aria-live="polite">
        <p className="eyebrow">WHAT JUST HAPPENED</p>
        <h3>{snapshot.transitionTitle}</h3>
        <p>{snapshot.explanation}</p>
      </section>

      <SimulationControls
        canAdvance={canAdvance}
        canRewind={canRewind}
        onAdvance={advance}
        onReset={reset}
        onRewind={rewind}
      />
    </main>
  );
};
