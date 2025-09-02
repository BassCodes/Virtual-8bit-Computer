/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import { UiEventHandler, UiEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";

export default class turboButton implements UiComponent {
	container: HTMLElement;
	start_button: HTMLButtonElement;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	active: boolean = false;

	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		this.start_button = el("button").id("turbo_button").tx("TURBO").fin();

		this.start_button.addEventListener("click", () => {
			if (this.active) {
				this.events.dispatch(UiEvent.TurboOff);
				this.cpu_signals.dispatch(UiCpuSignal.TurboOff);
				this.active = false;
			} else {
				this.events.dispatch(UiEvent.TurboOn);
				this.cpu_signals.dispatch(UiCpuSignal.TurboOn);
				this.active = true;
			}
		});

		this.container.appendChild(this.start_button);

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;
	}
}
