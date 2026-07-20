import type { LessonDefinition } from "../domain/simulation/types";
import { libuvLesson } from "./libuvLesson";
import { microtaskLesson } from "./microtaskLesson";
import { nextTickLesson } from "./nextTickLesson";
import { phaseOverviewLesson } from "./phaseOverviewLesson";
import { promiseBeforeTimerLesson } from "./promiseBeforeTimerLesson";
import { synchronousExecutionLesson } from "./synchronousExecutionLesson";
import { timerIntroductionLesson } from "./timerIntroduction";
import { timerOrderingLesson } from "./timerOrderingLesson";
import { timerPriorityCheckpointLesson } from "./timerPriorityCheckpointLesson";

export const eventLoopLessons: readonly LessonDefinition[] = [
  synchronousExecutionLesson,
  timerIntroductionLesson,
  timerOrderingLesson,
  promiseBeforeTimerLesson,
  microtaskLesson,
  nextTickLesson,
  phaseOverviewLesson,
  timerPriorityCheckpointLesson,
  libuvLesson,
];
