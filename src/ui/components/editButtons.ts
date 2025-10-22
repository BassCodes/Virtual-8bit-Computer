/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import { UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { u8 } from "../../num.js";
import UiComponent from "../uiComponent";

export default class EditButtons implements UiComponent {
	container: HTMLElement;
	edit_button: HTMLButtonElement;
	events: UiEventHandler;
	on: boolean = false;
	cpu_signals: UiCpuSignalHandler;

	insert_button: HTMLButtonElement;
	delete_button: HTMLButtonElement;

	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.events = events;
		this.container = element;
		this.cpu_signals = cpu_signals;
		this.edit_button = el("button")
			.tx("Edit")
			.cl("edit_button")
			.ev("click", () => this.editToggle())
			.appendTo(this.container);

		this.insert_button = el("button")
			.tx("Insert")
			.cl("hidden")
			.ev("click", () => this.insertByte())
			.appendTo(this.container);
		this.delete_button = el("button")
			.tx("Delete")
			.cl("hidden")
			.ev("click", () => this.deleteByte())
			.appendTo(this.container);
	}

	editToggle(): void {
		if (this.on) {
			this.edit_button.classList.remove("on");
			this.edit_button.classList.add("off");
			this.insert_button.classList.add("hidden");
			this.delete_button.classList.add("hidden");
			this.events.dispatch(UiEvent.EditOff);
			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuSoftReset);
			this.on = false;
		} else {
			this.on = true;
			this.events.dispatch(UiEvent.EditOn);
			this.cpu_signals.dispatch(UiCpuSignal.StopCpu);
			this.edit_button.classList.add("on");
			this.insert_button.classList.remove("hidden");
			this.delete_button.classList.remove("hidden");
			this.edit_button.classList.remove("off");
		}
	}

	getSelectedPosition(): Promise<u8 | null> {
		const p: Promise<u8 | null> = new Promise((resolve) => {
			this.events.dispatch(UiEvent.RequestEditorCursorPosition, (v) => {
				resolve(v);
			});
		});
		const t: Promise<null> = new Promise((resolve) => {
			setTimeout(() => {
				resolve(null);
			}, 200);
		});

		return Promise.race([p]);
	}

	insertByte(): void {
		if (!this.on) {
			return;
		}
		this.events.dispatch(UiEvent.RequestInsertByte);
	}

	deleteByte(): void {
		if (!this.on) {
			return;
		}
		this.events.dispatch(UiEvent.RequestDeleteByte);
	}

	reset(): void {
		if (this.on) {
			this.editToggle();
		}
	}
}
