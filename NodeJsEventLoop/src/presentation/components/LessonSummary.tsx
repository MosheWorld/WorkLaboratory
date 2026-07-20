import type { LessonDefinition } from "../../domain/simulation/types";

interface LessonSummaryProps {
  readonly lesson: LessonDefinition;
  readonly snapshotIndex: number;
}

export const LessonSummary = ({ lesson, snapshotIndex }: LessonSummaryProps): React.JSX.Element => {
  const transitionNumber = snapshotIndex + 1;
  const transitionCount = lesson.snapshots.length;
  const progressPercentage = (transitionNumber / transitionCount) * 100;
  const progressLabel = `Transition ${String(transitionNumber)} of ${String(transitionCount)}`;

  return (
    <>
      <section className="lesson-heading" aria-labelledby="lesson-title">
        <div>
          <p className="lesson-level">{lesson.level}</p>
          <h2 id="lesson-title">{lesson.title}</h2>
          <p>{lesson.description}</p>
        </div>
        <p className="step-counter">{progressLabel}</p>
      </section>

      <aside className="lesson-takeaway" aria-label="Rule to remember">
        <span>Rule to remember</span>
        <strong>{lesson.takeaway}</strong>
      </aside>

      <div
        className="transition-progress"
        aria-label={progressLabel}
        aria-valuemax={transitionCount}
        aria-valuemin={1}
        aria-valuenow={transitionNumber}
        role="progressbar"
      >
        <span style={{ width: `${String(progressPercentage)}%` }} />
      </div>
    </>
  );
};
