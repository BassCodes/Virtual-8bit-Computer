import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import UiComponent from "../uiComponent";

export type ComputerStateUiRepresentation = "Ready" | "Edit" | "Running" | "Errored";

export default class StateManager implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	state: ComputerStateUiRepresentation;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.state = "init" as ComputerStateUiRepresentation;
		this.setState("Ready");

		this.events.listen(UiEvent.EditOn, () => {
			this.setState("Edit");
		});
		this.events.listen(UiEvent.EditOff, () => {
			this.setState("Ready");
		});
	}

	setState(s: ComputerStateUiRepresentation): void {
		if (s !== this.state) {
			this.container.classList.add(s.toLowerCase());
			this.container.classList.remove(this.state.toLowerCase());
			this.state = s;

			this.events.dispatch(UiEvent.StateChange, this.state);
		}
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.ClockStarted, () => this.setState("Running"));
		// c.listen(CpuEvent.ClockStopped, () => this.setState("Ready"));
		c.listen(CpuEvent.InstructionErrored, () => this.setState("Errored"));
		c.listen(CpuEvent.InstructionParseErrored, () => this.setState("Errored"));
	}

	reset(): void {
		this.setState("Ready");
	}

	softReset(): void {
		this.setState("Ready");
	}
}
