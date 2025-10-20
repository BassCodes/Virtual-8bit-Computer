/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { $, el } from "../../etc";
import { UiEventHandler, UiEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import { CpuSpeed } from "../../types";
import UiComponent from "../uiComponent";

const SPEED_STATES: CpuSpeed[] = ["slow", "normal", "fast", "super fast", "turbo"];

export default class ButtonBox implements UiComponent {
	container: HTMLElement;
	start_button: HTMLButtonElement;
	step_button: HTMLButtonElement;
	speed_button: HTMLButtonElement;
	reset_button: HTMLButtonElement;
	events: UiEventHandler;
	on: boolean = false;
	cpu_signals: UiCpuSignalHandler;
	current_speed: CpuSpeed;

	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		this.start_button = el("button")
			.id("pause_play_button")
			.tx("Start")
			.ev("click", () => {
				if (this.on) {
					this.cpu_signals.dispatch(UiCpuSignal.StopCpu);
				} else {
					this.cpu_signals.dispatch(UiCpuSignal.StartCpu);
				}
			})
			.appendTo(this.container);
		this.step_button = el("button")
			.id("step_button")
			.tx("Step")
			.ev("click", () => this.step())
			.appendTo(this.container);

		this.current_speed = "normal";
		this.speed_button = el("button")
			.id("turbo_button")
			.tx(this.current_speed.toUpperCase())
			.ev("click", (e) => {
				const new_idx = (SPEED_STATES.indexOf(this.current_speed) + 1) % SPEED_STATES.length;
				this.current_speed = SPEED_STATES[new_idx];
				this.cpu_signals.dispatch(UiCpuSignal.SetSpeed, this.current_speed);

				(e.target as HTMLElement).textContent = this.current_speed.toUpperCase();
			})
			.appendTo(this.container);

		this.reset_button = el("button")
			.ti("Reset State")
			.tx("Reset")
			.ev("click", () => this.cpu_signals.dispatch(UiCpuSignal.RequestCpuSoftReset))
			.appendTo(this.container);

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;
	}

	disable(): void {
		for (const button of [this.start_button, this.step_button, this.speed_button]) {
			button.setAttribute("disabled", "true");
		}
	}

	step(): void {
		this.cpu_signals.dispatch(UiCpuSignal.StepCpu);
	}

	reset(): void {
		for (const button of [this.start_button, this.step_button, this.speed_button, this.reset_button]) {
			button.removeAttribute("disabled");
		}
		this.on = false;
		this.start_button.textContent = "Start";
	}

	softReset(): void {
		this.reset();
	}

	initUiEvents(u: UiEventHandler): void {
		u.listen(UiEvent.StateChange, (s) => {
			switch (s) {
				case "Edit":
					this.disable();
					this.reset_button.setAttribute("disabled", "true");
					this.start_button.textContent = "Start";
					break;
				case "Errored":
					this.disable();
					this.start_button.textContent = "Start";
					break;
				case "Ready":
					this.start_button.textContent = "Start";
					this.on = false;
					break;
				case "Running":
					this.start_button.textContent = "Stop";
					this.on = true;
					break;
				case "Halted":
					this.start_button.textContent = "Start";
					this.on = false;
			}
		});
		u.listen(UiEvent.EditOn, () => this.disable());
		u.listen(UiEvent.EditOff, () => this.reset());
	}
}
