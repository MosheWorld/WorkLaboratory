import type { EventLoopCycleStage } from "../../../domain/simulation/types";

interface CycleNodeProps {
  readonly activeCycleStage: EventLoopCycleStage | undefined;
  readonly examples: readonly string[];
  readonly note: string;
  readonly snapshotId: string;
  readonly stage: EventLoopCycleStage;
  readonly title: string;
  readonly subtitle: string;
}

const CycleNode = ({ activeCycleStage, examples, note, snapshotId, stage, subtitle, title }: CycleNodeProps): React.JSX.Element => (
  <li className={activeCycleStage === stage ? "cycle-node active-cycle-node" : "cycle-node"}>
    <span className="cycle-node-marker" aria-hidden="true" />
    <div><strong>{title}</strong><small>{subtitle}</small></div>
    {activeCycleStage === stage ? <span className="cycle-stage-runner" key={snapshotId}><i aria-hidden="true" />Running</span> : null}
    {examples.length === 0 ? null : <aside className="cycle-code-example" role="tooltip">
      <span>Common examples</span>
      <p>{note}</p>
      <ul>{examples.map((example) => <li key={example}><code>{example}</code></li>)}</ul>
    </aside>}
  </li>
);

interface PriorityCheckpointProps {
  readonly activeCycleStage: EventLoopCycleStage | undefined;
  readonly snapshotId: string;
  readonly stage: EventLoopCycleStage;
}

const PriorityCheckpoint = ({ activeCycleStage, snapshotId, stage }: PriorityCheckpointProps): React.JSX.Element => (
  <li className={activeCycleStage === stage ? "priority-checkpoint active-priority-checkpoint" : "priority-checkpoint"}>
    <span className="checkpoint-label">On return to Node</span>
    <span className="checkpoint-queue"><strong>1</strong> nextTick queue</span>
    <span className="checkpoint-arrow" aria-hidden="true">→</span>
    <span className="checkpoint-queue"><strong>2</strong> V8 microtask queue</span>
    <small>Drain V8 microtasks fully, then repeat if they queued nextTicks.</small>
    {activeCycleStage === stage ? <span className="checkpoint-runner" key={snapshotId} aria-hidden="true" /> : null}
  </li>
);

interface EventLoopCycleOverviewProps {
  readonly activeCycleStage: EventLoopCycleStage | undefined;
  readonly snapshotId: string;
  readonly transitionTitle: string;
}

export const EventLoopCycleOverview = ({ activeCycleStage, snapshotId, transitionTitle }: EventLoopCycleOverviewProps): React.JSX.Element => (
  <section className="runtime-diagram cycle-overview" aria-label="libuv event loop cycle">
    <div className="runtime-heading">
      <div><p className="eyebrow">THE LIBUV CYCLE</p><h2>One regular loop iteration, from start to repeat</h2></div>
      <span className="runtime-version">Node.js 22+ · libuv 1.45+</span>
    </div>
    <div className="scheduling-model" aria-label="How the earlier queue model maps to Node.js">
      <article>
        <span>Earlier simplified model</span>
        <strong>Callback queue</strong>
        <p>One box grouped phase callbacks so the first lessons stayed approachable. This map shows a regular iteration; libuv also runs an initial timer pass before entering the loop.</p>
      </article>
      <span className="model-arrow" aria-hidden="true">→</span>
      <article>
        <span>Simplified phase model</span>
        <strong>Several phase queues</strong>
        <p>Timers, poll I/O, <code>setImmediate</code>, and close callbacks wait in different places.</p>
      </article>
      <span className="model-arrow" aria-hidden="true">+</span>
      <article className="microtask-definition">
        <span>After Node-dispatched callbacks</span>
        <strong>Priority checkpoint</strong>
        <p>Drain <code>nextTick</code>, then V8 microtasks: Promise handlers, <code>queueMicrotask</code>, and resumed <code>await</code>. Synchronous calls and event listeners do not each create a checkpoint.</p>
        <p>If the first of two queued Promise handlers schedules a <code>nextTick</code>, the order is <code>Promise 1 → Promise 2 → nextTick</code>.</p>
      </article>
    </div>
    <div className="cycle-map">
      <div className={activeCycleStage === "alive-check" ? "loop-alive-card active-cycle-node" : "loop-alive-card"}>
        <span>Decision</span><strong>Is the loop alive?</strong><small>No work remains, Node can exit. Otherwise, continue.</small>
        {activeCycleStage === "alive-check" ? <i className="cycle-card-pulse" key={snapshotId} aria-hidden="true" /> : null}
      </div>
      <div className="cycle-live-transition" key={snapshotId} role="status"><span>Animating now</span><strong>{transitionTitle}</strong></div>
      <ol className="cycle-path">
        <CycleNode activeCycleStage={activeCycleStage} examples={["Deferred TCP ECONNREFUSED processing (some Unix systems)"]} note="Certain system callbacks are deferred here. An error listener does not select a phase; the operation and platform determine how the error is delivered." snapshotId={snapshotId} stage="pending" subtitle="Phase queue: deferred system callbacks" title="Pending callbacks" />
        <PriorityCheckpoint activeCycleStage={activeCycleStage} snapshotId={snapshotId} stage="pending-priority-checkpoint" />
        <CycleNode activeCycleStage={activeCycleStage} examples={["Internal to Node.js and libuv"]} note="Your application does not place JavaScript callbacks in this phase." snapshotId={snapshotId} stage="idle" subtitle="Internal libuv work" title="Idle handles" />
        <CycleNode activeCycleStage={activeCycleStage} examples={["Internal to Node.js and libuv"]} note="This prepares polling. It is not related to async or await syntax." snapshotId={snapshotId} stage="prepare" subtitle="Prepare to poll" title="Prepare handles" />
        <CycleNode activeCycleStage={activeCycleStage} examples={["fs.readFile('data.txt', onRead)", "server.on('request', onRequest)", "socket.on('data', onData)"]} note="The poll queue holds ready I/O callbacks. Each callback moves to the call stack and runs synchronously, one at a time." snapshotId={snapshotId} stage="poll" subtitle="Phase queue: most I/O callbacks" title="Poll for I/O" />
        <PriorityCheckpoint activeCycleStage={activeCycleStage} snapshotId={snapshotId} stage="poll-priority-checkpoint" />
        <CycleNode activeCycleStage={activeCycleStage} examples={["setImmediate(onImmediate)", "setImmediate(() => console.log('check'))"]} note="An immediate runs before a zero-delay timer scheduled in the same I/O callback. At top level, their relative order is not guaranteed." snapshotId={snapshotId} stage="check" subtitle="Phase queue: setImmediate callbacks" title="Check handles" />
        <PriorityCheckpoint activeCycleStage={activeCycleStage} snapshotId={snapshotId} stage="check-priority-checkpoint" />
        <CycleNode activeCycleStage={activeCycleStage} examples={["socket.on('close', onClose)", "socket.destroy() // with an active native handle"]} note="Native handle cleanup can emit its close event from this processing; other closing paths can use nextTick. The drained server's close event uses nextTick, not this phase." snapshotId={snapshotId} stage="close" subtitle="Native handle close callbacks" title="Close callbacks" />
        <PriorityCheckpoint activeCycleStage={activeCycleStage} snapshotId={snapshotId} stage="close-priority-checkpoint" />
        <CycleNode activeCycleStage={activeCycleStage} examples={[]} note="" snapshotId={snapshotId} stage="update-time" subtitle="Internal clock bookkeeping" title="Update loop time" />
        <CycleNode activeCycleStage={activeCycleStage} examples={["setTimeout(onReady, 0)", "setTimeout(onReady, 1000)", "setInterval(onTick, 1000)"]} note="Eligible timer callbacks run from the timers phase queue. The delay is a minimum threshold, not a guaranteed execution time." snapshotId={snapshotId} stage="timers" subtitle="Phase queue: due timer callbacks" title="Run due timers" />
        <PriorityCheckpoint activeCycleStage={activeCycleStage} snapshotId={snapshotId} stage="timers-priority-checkpoint" />
      </ol>
      <div className={activeCycleStage === "repeat" ? "cycle-return active-cycle-return" : "cycle-return"}>
        <span aria-hidden="true">↻</span><strong>Work remains?</strong><small>Begin the next iteration</small>
        {activeCycleStage === "repeat" ? <i className="cycle-card-pulse" key={snapshotId} aria-hidden="true" /> : null}
      </div>
    </div>
  </section>
);
