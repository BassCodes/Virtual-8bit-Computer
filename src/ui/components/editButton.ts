/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el, $ } from "../../etc";
import { UiEventHandler, UiEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";

export default class EditButton implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, event: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = event;
		this.cpu_signals = cpu_signals;
		el("button")
			.tx("Edit")
			.cl("edit_button")
			.ev("click", () => this.editToggle())
			.appendTo(this.container);
	}

	disable(): void {
		const is_on = this.container.classList.contains("on");
		if (is_on) {
			this.editToggle();
		}
	}

	editToggle(): void {
		const is_on = this.container.classList.contains("on");
		if (is_on) {
			this.container.classList.remove("on");
			$("root").classList.remove("editor");
			this.container.classList.add("off");
			this.events.dispatch(UiEvent.EditOff);
		} else {
			this.events.dispatch(UiEvent.EditOn);
			$("root").classList.add("editor");
			this.container.classList.add("on");
			this.container.classList.remove("off");
		}
	}

	reset(): void {
		this.disable();
	}

	softReset(): void {
		this.disable();
	}
}
