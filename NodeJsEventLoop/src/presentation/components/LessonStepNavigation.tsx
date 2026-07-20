import type { LessonDefinition } from "../../domain/simulation/types";

interface LessonStepNavigationProps {
  readonly activeLessonId: string;
  readonly lessons: readonly LessonDefinition[];
  readonly onLessonSelected: (lesson: LessonDefinition) => void;
}

export const LessonStepNavigation = ({ activeLessonId, lessons, onLessonSelected }: LessonStepNavigationProps): React.JSX.Element => (
  <nav className="lesson-step-navigation" aria-label="Learning steps">
    <p className="eyebrow">LEARNING PATH</p>
    <ol>
      {lessons.map((lesson, index) => {
        const isSelected = lesson.id === activeLessonId;
        return (
          <li key={lesson.id}>
            <button
              aria-current={isSelected ? "step" : undefined}
              className={isSelected ? "lesson-step active-step" : "lesson-step"}
              onClick={() => { onLessonSelected(lesson); }}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{lesson.title}</strong>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);
