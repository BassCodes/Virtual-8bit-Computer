/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { $, el } from "../../etc";
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
	edit_button: HTMLButtonElement;
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

		this.edit_button = el("button")
			.tx("Edit")
			.cl("edit_button")
			.ev("click", () => this.editToggle())
			.appendTo(this.container);

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;
	}

	lock(): void {
		for (const button of [this.start_button, this.step_button, this.speed_button]) {
			lock_button(button);
		}
	}

	step(): void {
		this.cpu_signals.dispatch(UiCpuSignal.StepCpu);
	}

	reset(): void {
		if (this.edit_button.classList.contains("on")) {
			this.editToggle();
		}
		for (const button of [this.start_button, this.step_button, this.speed_button, this.reset_button]) {
			unlock_button(button);
		}
		this.on = false;
		this.start_button.textContent = "Start";
	}

	softReset(): void {
		this.reset();
	}

	editToggle(): void {
		if (this.edit_button.classList.contains("on")) {
			this.edit_button.classList.remove("on");
			$("root").classList.remove("editor");
			this.edit_button.classList.add("off");
			this.events.dispatch(UiEvent.EditOff);
			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuSoftReset);
		} else {
			this.events.dispatch(UiEvent.EditOn);
			this.cpu_signals.dispatch(UiCpuSignal.StopCpu);
			$("root").classList.add("editor");
			this.edit_button.classList.add("on");
			this.edit_button.classList.remove("off");
		}
	}

	initUiEvents(u: UiEventHandler): void {
		u.listen(UiEvent.StateChange, (s) => {
			switch (s) {
				case "Edit":
					this.lock();
					lock_button(this.reset_button);
					this.start_button.textContent = "Start";
					break;
				case "Errored":
					this.lock();
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
			}
		});
		u.listen(UiEvent.EditOn, () => this.lock());
		u.listen(UiEvent.EditOff, () => this.reset());
	}
}

function lock_button(b: HTMLButtonElement): void {
	b.setAttribute("disabled", "true");
	b.classList.add("locked");
}

function unlock_button(b: HTMLButtonElement): void {
	b.removeAttribute("disabled");
	b.classList.remove("locked");
}
