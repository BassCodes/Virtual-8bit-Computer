/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import { UiEventHandler, UiEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";

const MAX_SLIDER = 1000;

export default class PausePlay implements UiComponent {
	container: HTMLElement;
	start_button: HTMLButtonElement;
	step_button: HTMLButtonElement;
	range: HTMLInputElement;
	events: UiEventHandler;
	on: boolean = false;
	cycle_delay: number;
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
		this.range = el("input")
			.id("speed_range")
			.at("type", "range")
			.at("min", "0")
			.at("max", MAX_SLIDER.toString())
			.at("value", "0")
			.ev("input", (e) => {
				const delay = MAX_SLIDER - parseInt((e.target as HTMLInputElement).value, 10) + 0.0;
				this.cycle_delay = delay;
				console.log(this.cycle_delay);
			})
			.appendTo(this.container);

		this.cycle_delay = 1000;

		this.events.listen(UiEvent.EditOn, () => this.disable());
		this.events.listen(UiEvent.EditOff, () => this.enable());

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;
	}

	disable(): void {
		this.stop();
		this.start_button.setAttribute("disabled", "true");
		this.step_button.setAttribute("disabled", "true");
		this.range.setAttribute("disabled", "true");
	}

	enable(): void {
		this.start_button.removeAttribute("disabled");
		this.step_button.removeAttribute("disabled");
		this.range.removeAttribute("disabled");
	}

	toggle(): void {
		if (this.on) {
			this.start_button.textContent = "Start";
			this.on = false;
		} else {
			this.on = true;
			this.cycle();
			this.start_button.textContent = "Stop";
		}
	}

	private cycle(): void {
		const loop = (): void => {
			if (this.on === false) return;

			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuCycle, 1);
			setTimeout(loop, this.cycle_delay);
		};
		loop();
	}

	private step(): void {
		if (this.on) {
			this.stop();
		} else {
			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuCycle, 1);
		}
	}

	start(): void {
		if (this.on) return;
		this.toggle();
	}

	stop(): void {
		if (!this.on) return;
		this.toggle();
	}

	reset(): void {
		this.stop();
		this.enable();
	}

	softReset(): void {
		this.reset();
	}
}
