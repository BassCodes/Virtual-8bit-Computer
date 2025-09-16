/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import { UiEventHandler, UiEvent, UiCpuSignalHandler, UiCpuSignal, CpuSpeed } from "../../events";
import UiComponent from "../uiComponent";

const STATES: CpuSpeed[] = ["slow", "fast", "turbo"];

export default class SpeedButton implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	current_speed: CpuSpeed;

	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		this.current_speed = "normal";
		el("button")
			.id("turbo_button")
			.tx(this.current_speed.toUpperCase())
			.ev("click", (e) => {
				const new_idx = (STATES.indexOf(this.current_speed) + 1) % STATES.length;
				this.current_speed = STATES[new_idx];
				this.cpu_signals.dispatch(UiCpuSignal.SetSpeed, this.current_speed);
				if (e.target) {
					e.target.textContent = this.current_speed.toUpperCase();
				}
			})
			.appendTo(this.container);
	}
}
