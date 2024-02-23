import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { $, el, format_hex } from "./etc";
import { InstructionExplainer } from "./ui/instructionExplainer";
import { MemoryView } from "./ui/memoryView";
import { frequencyIndicator } from "./ui/frequencyIndicator";
import { RegisterView } from "./ui/registerView";
import { Screen } from "./ui/screen";
import { UiComponent, UiComponentConstructor } from "./ui/uiComponent.js";
// Certainly the messiest portion of this program
// Needs to be broken into components
// Breaking up into components has started but has yet to conclude

let delay = 100;

export class UI {
	printout: HTMLElement;

	auto_running: boolean;

	events: UiEventHandler = new UiEventHandler();

	private components: Array<UiComponent>;

	constructor() {
		for (const [, e_type] of Object.entries(UiEvent)) {
			this.events.register_event(e_type as UiEvent);
		}
		this.events.seal();

		this.components = [];

		this.register_component(MemoryView, $("memory"));
		this.register_component(frequencyIndicator, $("cycles"));
		this.register_component(InstructionExplainer, $("instruction_explainer"));
		this.register_component(RegisterView, $("registers"));
		this.register_component(Screen, $("screen") as HTMLCanvasElement);
		this.printout = $("printout");

		this.auto_running = false;
		const pp_button = $("pause_play_button");

		pp_button.addEventListener("click", () => {
			if (this.auto_running) {
				this.stop_auto();
				pp_button.textContent = "Starp";
			} else {
				this.start_auto();
				pp_button.textContent = "Storp";
			}
		});
		$("step_button").addEventListener("click", () => {
			if (this.auto_running) {
				this.stop_auto();
			}

			this.events.dispatch(UiEvent.RequestCpuCycle, 1);
		});

		$("delay_range").addEventListener("input", (e) => {
			delay = parseInt((e.target as HTMLInputElement).value, 10);
			// console.log(delay);
		});
	}
	private register_component(c: UiComponentConstructor, e: HTMLElement): void {
		if (e === undefined) {
			console.log(c);
			throw new Error("Could not find HTML element while registering UI component");
		}
		const component = new c(e, this.events);
		this.components.push(component);
	}

	init_events(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Print, (char) => {
			this.printout.textContent = (this.printout.textContent ?? "") + char;
		});
		cpu_events.listen(CpuEvent.Reset, () => {
			this.reset();
		});

		for (const c of this.components) {
			c.init_cpu_events(cpu_events);
		}
	}

	reset(): void {
		this.stop_auto();
		for (const c of this.components) {
			c.reset();
		}
		this.printout.textContent = "";
	}

	start_auto(speed: number = 200): void {
		if (this.auto_running) {
			return;
		}
		this.auto_running = true;
		const loop = (): void => {
			if (this.auto_running === false) {
				return;
			}
			this.events.dispatch(UiEvent.RequestCpuCycle, 1);
			setTimeout(loop, delay);
		};
		loop();
	}

	stop_auto(): void {
		this.auto_running = false;
	}
}
