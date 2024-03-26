import { el } from "../../etc";
import { UiEventHandler, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";

export default class ResetButtons implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		const reset_button = el("button").cl("nostyle").ti("Reset State").tx("⟳").fin();
		const trash_button = el("button").cl("nostyle").ti("Delete Code").tx("🗑").fin();

		reset_button.addEventListener("click", () => this.resetClicked());
		trash_button.addEventListener("click", () => this.trashClicked());
		this.container.append(reset_button, trash_button);
	}

	resetClicked(): void {
		this.cpu_signals.dispatch(UiCpuSignal.RequestCpuSoftReset);
	}

	trashClicked(): void {
		const a = confirm("Clear all code? Irreversible");
		if (a) {
			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);
		}
	}
}
