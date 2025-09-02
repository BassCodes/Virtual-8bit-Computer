import { el } from "../../etc";
import { UiEventHandler, UiEvent, CpuEventHandler, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import UiComponent from "../uiComponent";
import HoverTextBox from "../hoverTextBox";

const MAX_SLIDER = 1000;

export default class pausePlay implements UiComponent {
	container: HTMLElement;
	start_button: HTMLButtonElement;
	step_button: HTMLButtonElement;
	range: HTMLInputElement;
	events: UiEventHandler;
	on: boolean = false;
	cycle_delay: number;
	cpu_signals: UiCpuSignalHandler;

	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		this.start_button = el("button").id("pause_play_button").tx("Start").fin();
		this.step_button = el("button").id("step_button").tx("Step").fin();
		this.range = el("input")
			.id("speed_range")
			.at("type", "range")
			.at("min", "0")
			.at("max", MAX_SLIDER.toString())
			.at("value", "0")
			.fin();
		this.start_button.addEventListener("click", () => this.toggle());
		this.step_button.addEventListener("click", () => this.step());
		this.range.addEventListener("input", (e) => {
			const delay = MAX_SLIDER - parseInt((e.target as HTMLInputElement).value, 10) + 0.0;
			this.cycle_delay = delay;
			console.log(this.cycle_delay);
		});

		this.container.appendChild(this.start_button);
		this.container.appendChild(this.step_button);
		this.container.appendChild(this.range);
		this.cycle_delay = 1000;

		this.events.listen(UiEvent.EditOn, () => this.disable());
		this.events.listen(UiEvent.EditOff, () => this.enable());

		const s_width = this.start_button.offsetWidth;
		this.start_button.style.width = `${s_width.toString()}px`;

		// const tb = new HoverTextBox(this.start_button, el("span").tx("hover test").st("color", "yellow").fin(), "left", 10);
		// tb.show();
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
			this.start_button.textContent = "Stop";
		}
	}

	private cycle(): void {
		const loop = (): void => {
			if (this.on === false) return;

			for (let i = 0; i < 32; i++) {
				this.cpu_signals.dispatch(UiCpuSignal.RequestCpuCycle, 1);
			}
			setTimeout(loop, this.cycle_delay);
		};
		loop();
	}

	private step(): void {
		if (this.on) {
			this.stop();
		} else {
			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuCycle, 1);
		}
	}

	start(): void {
		if (this.on) return;
		this.toggle();
	}

	stop(): void {
		if (!this.on) return;
		this.toggle();
	}

	reset(): void {
		this.stop();
		this.enable();
	}

	softReset(): void {
		this.reset();
	}
}
