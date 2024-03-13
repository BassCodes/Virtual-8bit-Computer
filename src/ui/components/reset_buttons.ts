import { el } from "../../etc";
import { UiEventHandler, UiCpuSignalHandler, UiEvent, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";

export default class ResetButtons implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		const reset_button = el("button").cl("nostyle").tx("R").fin();
		const trash_button = el("button").cl("nostyle").tx("T").fin();

		reset_button.addEventListener("click", () => this.reset_clicked());
		trash_button.addEventListener("click", () => this.trash_clicked());
		this.container.append(reset_button, trash_button);
	}

	reset_clicked(): void {}

	trash_clicked(): void {
		this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);
	}
}
