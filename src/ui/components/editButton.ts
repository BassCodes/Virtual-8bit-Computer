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
	edit_button: HTMLButtonElement;
	constructor(element: HTMLElement, event: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = event;
		this.cpu_signals = cpu_signals;
		this.edit_button = el("button")
			.tx("Edit")
			.cl("edit_button")
			.ev("click", () => this.editToggle())
			.appendTo(this.container);
	}

	disable(): void {
		if (this.edit_button.classList.contains("on")) {
			this.editToggle();
		}
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

	reset(): void {
		this.disable();
	}

	softReset(): void {
		this.disable();
	}
}
