import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import UiComponent from "../uiComponent";

export type ComputerStateUiRepresentation = "Ready" | "Edit" | "Running" | "Errored";

export default class StateManager implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	state: ComputerStateUiRepresentation;
	constructor(element: HTMLElement, events: UiEventHandler) {
		this.container = element;
		this.events = events;
		this.state = "unset" as ComputerStateUiRepresentation;
		this.setState("Ready");
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
		c.listen(CpuEvent.ClockStopped, () => {
			if (this.state !== "Edit") this.setState("Ready");
		});
		c.listen(CpuEvent.InstructionErrored, () => this.setState("Errored"));
		c.listen(CpuEvent.InstructionParseErrored, () => this.setState("Errored"));
	}

	initUiEvents(e: UiEventHandler): void {
		e.listen(UiEvent.EditOn, () => {
			this.setState("Edit");
		});
		e.listen(UiEvent.EditOff, () => {
			this.setState("Ready");
		});
	}

	reset(): void {
		this.setState("Ready");
	}

	softReset(): void {
		this.setState("Ready");
	}
}
