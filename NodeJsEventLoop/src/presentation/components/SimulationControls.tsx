interface SimulationControlsProps {
  readonly canAdvance: boolean;
  readonly canRewind: boolean;
  readonly onAdvance: () => void;
  readonly onReset: () => void;
  readonly onRewind: () => void;
}

export const SimulationControls = ({
  canAdvance,
  canRewind,
  onAdvance,
  onReset,
  onRewind,
}: SimulationControlsProps): React.JSX.Element => (
  <nav className="simulation-controls" aria-label="Simulation controls">
    <button disabled={!canRewind} onClick={onRewind} type="button">Previous</button>
    <button className="reset-button" onClick={onReset} type="button">Reset</button>
    <button className="primary-button" disabled={!canAdvance} onClick={onAdvance} type="button">Next transition</button>
  </nav>
);
