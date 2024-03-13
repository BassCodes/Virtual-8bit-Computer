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
		const image = el("img").at("src", "pencil.png").st("width", "20px").st("height", "20px").fin();
		this.container.classList.add("editor_toggle");
		this.container.addEventListener("click", () => this.edit_toggle());
		this.container.appendChild(image);
	}

	reset(): void {
		const is_on = this.container.classList.contains("on");
		if (is_on) {
			this.edit_toggle();
		}
	}

	edit_toggle(): void {
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
			this.cpu_signals.dispatch(UiCpuSignal.RequestProgramCounterChange, { address: 0 });
		}
	}
}
