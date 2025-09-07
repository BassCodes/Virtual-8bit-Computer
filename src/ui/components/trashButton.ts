/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import { UiEventHandler, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";

export default class TrashButton implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		el("button")
			.ev("click", () => this.trashClicked())
			.ti("Delete Code")
			.cl("trash_button")
			.tx("🗑")
			.appendTo(this.container);
	}

	trashClicked(): void {
		if (confirm("Clear all code? Irreversible")) {
			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);
		}
	}
}
