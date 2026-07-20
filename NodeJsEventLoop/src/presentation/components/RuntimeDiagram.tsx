import { useRuntimeTokenAnimation } from "../hooks/useRuntimeTokenAnimation";
import { RuntimeZone } from "./runtime/RuntimeZone";
import { EventLoopCycleOverview } from "./runtime/EventLoopCycleOverview";
import { visibilityByFocus, focusLabelByFocus } from "./runtime/runtimeVisibility";
import type { EventLoopCycleStage, EventLoopPhase, LessonFocus, RuntimeLocation, RuntimeToken } from "../../domain/simulation/types";

interface RuntimeDiagramProps {
  readonly activeCycleStage: EventLoopCycleStage | undefined;
  readonly activePhase: EventLoopPhase | null;
  readonly focus: LessonFocus;
  readonly snapshotId: string;
  readonly transitionTitle: string;
  readonly tokens: readonly RuntimeToken[];
}

const callbackQueueLocations: readonly RuntimeLocation[] = [
  "timers-queue",
  "poll-queue",
  "check-queue",
];

export const RuntimeDiagram = ({ activeCycleStage, activePhase, focus, snapshotId, tokens, transitionTitle }: RuntimeDiagramProps): React.JSX.Element => {
  const diagramRef = useRuntimeTokenAnimation(snapshotId, tokens);

  if (focus === "phase-overview") {
    return <EventLoopCycleOverview activeCycleStage={activeCycleStage} snapshotId={snapshotId} transitionTitle={transitionTitle} />;
  }
  const visibility = visibilityByFocus[focus];
  const showTransitionActivity = focus === "complete-runtime";
  const shouldShowNodeApis = visibility.timerApis || visibility.workerPool || visibility.operatingSystem;
  const visibleQueueCount = Number(visibility.nextTickQueue) + Number(visibility.microtaskQueue) + Number(visibility.callbackQueue && focus !== "complete-runtime");
  const queueTopologyClassName = visibleQueueCount === 1
    ? "queue-topology queue-columns-1"
    : visibleQueueCount === 2
      ? "queue-topology queue-columns-2"
      : "queue-topology";

  return (
    <section ref={diagramRef} className="runtime-diagram teaching-diagram" aria-label="Node.js event loop visualization">
      <div className="runtime-heading">
        <div><p className="eyebrow">VISUAL RUNTIME</p><h2>How a callback earns the call stack</h2></div>
        <span className="runtime-version">{focusLabelByFocus[focus]}</span>
      </div>

      {focus === "complete-runtime" ? <div className="runtime-transition" key={snapshotId}><span className="eyebrow">CURRENT TRANSITION</span><strong>{transitionTitle}</strong><small>Follow the highlighted frame. Callers wait underneath.</small></div> : null}

      <div className={shouldShowNodeApis ? "runtime-topology" : "runtime-topology call-stack-only"}>
        <RuntimeZone description="JavaScript runs one frame at a time" locations={["call-stack"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="Call stack" tokens={tokens} />

        {shouldShowNodeApis ? <section className="node-apis-zone" aria-label="Node.js APIs used in this lesson">
          <div className="diagram-zone-heading"><div><h3>Key Node.js APIs</h3><p>Only the APIs needed for this lesson</p></div></div>
          <div className="api-lanes">
            {visibility.timerApis ? <RuntimeZone description="setTimeout and setInterval" locations={["node-timers"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="Timer APIs" tokens={tokens} /> : null}
            {visibility.workerPool ? <RuntimeZone description="File and directory operations" locations={["libuv-worker-pool"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="libuv worker pool" tokens={tokens} /> : null}
            {visibility.operatingSystem ? <RuntimeZone description="Network readiness" locations={["operating-system"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="Operating system" tokens={tokens} /> : null}
          </div>
        </section> : null}
      </div>

      {visibility.eventLoop ? <div className="event-loop-bridge">
        <div className="event-loop-symbol" aria-hidden="true">↻</div>
        <div><p className="eyebrow">EVENT LOOP</p><p>When the call stack is empty, Node selects the next eligible callback.</p></div>
        {activePhase === null ? null : <span className="active-phase-label">Active phase: {activePhase}</span>}
        {showTransitionActivity ? <i className="event-loop-transition-pulse" key={snapshotId} aria-hidden="true" /> : null}
      </div> : null}

      {visibleQueueCount > 0 ? <div className={queueTopologyClassName}>
        {visibility.nextTickQueue ? <RuntimeZone description="Node drains this first" locations={["next-tick-queue"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="nextTick queue" tokens={tokens} /> : null}
        {visibility.microtaskQueue ? <RuntimeZone description="Promises and await continuations" locations={["microtask-queue"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="Microtask queue" tokens={tokens} /> : null}
        {visibility.callbackQueue && focus !== "complete-runtime" ? <RuntimeZone description="Timers, I/O, setImmediate, and close callbacks" locations={callbackQueueLocations} title="Callback queue" tokens={tokens} /> : null}
      </div> : null}

      {focus === "complete-runtime" ? <div className="phase-queue-topology">
        <RuntimeZone description="Ready I/O callbacks" locations={["poll-queue"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="Poll queue" tokens={tokens} />
        <RuntimeZone description="setImmediate callbacks" locations={["check-queue"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="Check queue" tokens={tokens} />
        <RuntimeZone description="Timers past their threshold" locations={["timers-queue"]} showTransitionActivity={showTransitionActivity} snapshotId={snapshotId} title="Timers queue" tokens={tokens} />
      </div> : null}

    </section>
  );
};
