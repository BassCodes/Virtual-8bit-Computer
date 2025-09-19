/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import {
	UiEventHandler,
	UiEvent,
	UiCpuSignalHandler,
	UiCpuSignal,
	CpuSpeed,
	CpuEventHandler,
	CpuEvent,
} from "../../events";
import UiComponent from "../uiComponent";

const SPEED_STATES: CpuSpeed[] = ["slow", "normal", "fast", "super fast", "turbo"];

export default class ButtonBox implements UiComponent {
	container: HTMLElement;
	start_button: HTMLButtonElement;
	step_button: HTMLButtonElement;
	speed_button: HTMLButtonElement;
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
			.ev("click", () => this.toggle())
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
		this.events.listen(UiEvent.EditOn, () => this.disable());
		this.events.listen(UiEvent.EditOff, () => this.enable());

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;
	}

	disable(): void {
		this.start_button.setAttribute("disabled", "true");
		this.step_button.setAttribute("disabled", "true");
		this.speed_button.setAttribute("disabled", "true");
	}

	enable(): void {
		this.start_button.removeAttribute("disabled");
		this.step_button.removeAttribute("disabled");
		this.speed_button.removeAttribute("disabled");
	}

	step(): void {
		this.cpu_signals.dispatch(UiCpuSignal.StepCpu);
	}

	toggle(): void {
		if (this.on) {
			this.cpu_signals.dispatch(UiCpuSignal.StopCpu);
		} else {
			this.cpu_signals.dispatch(UiCpuSignal.StartCpu);
		}
	}

	reset(): void {
		this.enable();
	}

	softReset(): void {
		this.reset();
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.ClockStopped, () => {
			this.start_button.textContent = "Start";
			this.on = false;
		});
		c.listen(CpuEvent.ClockStarted, () => {
			this.start_button.textContent = "Stop";
			this.on = true;
		});
	}
}
