/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import { UiEventHandler, UiEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";

export default class PausePlay implements UiComponent {
	container: HTMLElement;
	start_button: HTMLButtonElement;
	step_button: HTMLButtonElement;
	events: UiEventHandler;
	on: boolean = false;
	cpu_signals: UiCpuSignalHandler;

	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		this.start_button = el("button")
			.id("pause_play_button")
			.tx("Start")
			.ev("click", () => this.toggle())
			.appendTo(this.container);
		this.step_button = el("button")
			.id("step_button")
			.tx("Step")
			.ev("click", () => this.step())
			.appendTo(this.container);

		this.events.listen(UiEvent.EditOn, () => this.disable());
		this.events.listen(UiEvent.EditOff, () => this.enable());

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;
	}

	disable(): void {
		this.start_button.setAttribute("disabled", "true");
		this.step_button.setAttribute("disabled", "true");
	}

	enable(): void {
		this.start_button.removeAttribute("disabled");
		this.step_button.removeAttribute("disabled");
	}

	step(): void {
		this.cpu_signals.dispatch(UiCpuSignal.StepCpu);
	}

	toggle(): void {
		if (this.on) {
			this.start_button.textContent = "Start";
			this.on = false;
			this.cpu_signals.dispatch(UiCpuSignal.StopCpu);
		} else {
			this.start_button.textContent = "Stop";
			this.on = true;
			this.cpu_signals.dispatch(UiCpuSignal.StartCpu);
		}
	}

	reset(): void {
		this.enable();
	}

	softReset(): void {
		this.reset();
	}
}
