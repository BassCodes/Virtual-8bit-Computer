import { el } from "../../etc";
import { UiEventHandler, UiEvent, UiCpuSignalHandler } from "../../events";
import UiComponent from "../uiComponent";

const MAX_SLIDER = 1000;

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
				this.active = false;
			} else {
				this.events.dispatch(UiEvent.TurboOn);
				this.active = true;
			}
		});

		this.container.appendChild(this.start_button);

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;
	}
}
