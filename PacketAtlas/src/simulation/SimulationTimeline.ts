import { DEVICES } from './network-data';
import { Simulation } from './Simulation';
/** Replay protocol events instead of copying closures or rewinding only the clock. */
export class SimulationTimeline {
  simulation: Simulation;
  remainder = 0;
  ticks = 0;

  constructor(simulation: Simulation) {
    this.simulation = simulation;
    this.remainder = 0;
    this.ticks = 0;
  }
  advance(seconds: number) {
    if (!this.simulation.running || this.simulation.paused) return;
    this.remainder += seconds;
    while (this.remainder + 1e-9 >= 0.01 && this.simulation.running) {
      this.simulation.tick(0.01);
      this.ticks++;
      this.remainder -= 0.01;
    }
  }
  step(direction: number) {
    const targetTicks = Math.max(0, this.ticks + direction * 50);
    if (direction < 0) {
      const previous = this.simulation;
      this.simulation = new Simulation(previous.protocol, DEVICES.indexOf(previous.device));
      this.ticks = 0;
    }
    this.remainder = 0;
    if (!this.simulation.complete) this.simulation.start();
    this.simulation.paused = false;
    while (this.ticks < targetTicks && this.simulation.running) {
      this.simulation.tick(0.01);
      this.ticks++;
    }
    this.simulation.paused = this.simulation.running;
    return this.simulation;
  }
}
