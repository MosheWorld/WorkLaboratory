import type { RuntimeLocation, RuntimeToken } from "../../../domain/simulation/types";

interface RuntimeZoneProps {
  readonly description: string;
  readonly locations: readonly RuntimeLocation[];
  readonly showTransitionActivity?: boolean;
  readonly snapshotId?: string;
  readonly title: string;
  readonly tokens: readonly RuntimeToken[];
}

export const RuntimeZone = ({ description, locations, showTransitionActivity = false, snapshotId, title, tokens }: RuntimeZoneProps): React.JSX.Element => {
  const matchingTokens = tokens.filter((token) => locations.includes(token.location));
  const isCallStack = locations.includes("call-stack");
  const executingToken = isCallStack ? matchingTokens.at(-1) : undefined;

  return (
    <section
      className={matchingTokens.length > 0 ? "diagram-zone active-zone" : "diagram-zone"}
      data-stack={isCallStack || undefined}
    >
      <div className="diagram-zone-heading">
        <div><h3>{title}</h3><p>{description}</p></div>
        <span className="queue-count">{matchingTokens.length}</span>
      </div>
      <div className="token-area">
        {matchingTokens.length === 0 ? <span className="empty-state">Waiting</span> : matchingTokens.map((token) => (
          <span className="runtime-token" data-token-id={token.id} key={token.id}>
            {isCallStack ? (
              <small className="frame-state">{token === executingToken ? "Executing" : "Caller"}</small>
            ) : null}
            {token.label}
          </span>
        ))}
      </div>
      {showTransitionActivity && matchingTokens.length > 0 && snapshotId !== undefined ? <i className="zone-transition-pulse" key={snapshotId} aria-hidden="true" /> : null}
    </section>
  );
};
