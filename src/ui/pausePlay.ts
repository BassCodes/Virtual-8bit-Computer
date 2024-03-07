import { el } from "../etc";
import { UiEventHandler, UiEvent } from "../events";
import { UiComponent } from "./uiComponent";

const MAX_SLIDER = 1000;

export class pausePlay implements UiComponent {
	element: HTMLElement;
	start_button: HTMLButtonElement;
	step_button: HTMLButtonElement;
	range: HTMLInputElement;
	events: UiEventHandler;
	on: boolean = false;
	cycle_delay: number;
	constructor(element: HTMLElement, events: UiEventHandler) {
		this.element = element;
		this.events = events;
		this.start_button = el("button", "pause_play_button");
		this.step_button = el("button", "step_button");
		this.range = el("input", "speed_range");
		this.range.max = MAX_SLIDER.toString();
		this.range.min = "0";
		this.range.type = "range";
		this.start_button.addEventListener("click", () => this.toggle());
		this.step_button.addEventListener("click", () => this.step());
		this.range.addEventListener("input", (e) => {
			const delay = MAX_SLIDER - parseInt((e.target as HTMLInputElement).value, 10) + 10;
			this.cycle_delay = delay;
		});
		this.start_button.textContent = "Start";
		this.step_button.textContent = "Step";
		this.element.appendChild(this.start_button);
		this.element.appendChild(this.step_button);
		this.element.appendChild(this.range);
		this.cycle_delay = 1000;
		this.range.value = "0";

		this.events.listen(UiEvent.EditOn, () => {
			this.disable();
		});
		this.events.listen(UiEvent.EditOff, () => {
			this.enable();
		});
	}

	disable(): void {
		this.stop();
		this.start_button.setAttribute("disabled", "true");
		this.step_button.setAttribute("disabled", "true");
		this.range.setAttribute("disabled", "true");
	}

	enable(): void {
		this.start_button.removeAttribute("disabled");
		this.step_button.removeAttribute("disabled");
		this.range.removeAttribute("disabled");
	}

	toggle(): void {
		if (this.on) {
			this.start_button.textContent = "Start";
			this.on = false;
		} else {
			this.on = true;
			this.cycle();
			this.start_button.textContent = "Storp";
		}
	}

	private cycle(): void {
		const loop = (): void => {
			if (this.on === false) {
				return;
			}
			this.events.dispatch(UiEvent.RequestCpuCycle, 1);
			setTimeout(loop, this.cycle_delay);
		};
		loop();
	}
	private step(): void {
		if (this.on) {
			this.stop();
		} else {
			this.events.dispatch(UiEvent.RequestCpuCycle, 1);
		}
	}

	start(): void {
		if (!this.on) {
			this.toggle();
		}
	}

	stop(): void {
		if (this.on) {
			this.toggle();
		}
	}

	reset(): void {
		this.stop();
		this.enable();
	}
}
