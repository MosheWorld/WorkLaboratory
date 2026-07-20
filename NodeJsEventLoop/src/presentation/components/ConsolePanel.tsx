import type { ConsoleEntry } from "../../domain/simulation/types";

interface ConsolePanelProps {
  readonly entries: readonly ConsoleEntry[];
}

export const ConsolePanel = ({ entries }: ConsolePanelProps): React.JSX.Element => (
  <section className="panel console-panel" aria-label="Console output">
    <div className="panel-header">
      <span className="terminal-prompt" aria-hidden="true">›_</span>
      <h3>Console output</h3>
    </div>
    <ul className="console-list">
      {entries.length === 0 ? (
        <li className="console-placeholder">Waiting for output...</li>
      ) : (
        entries.map((entry, index) => (
          <li key={entry.id}>
            <span className="console-line-number">{String(index + 1).padStart(2, "0")}</span>
            <span>{entry.value}</span>
          </li>
        ))
      )}
    </ul>
  </section>
);
