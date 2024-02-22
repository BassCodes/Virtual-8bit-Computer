import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { $, el, format_hex } from "./etc";
import { InstructionExplainer } from "./ui/instructionExplainer";
import { MemoryView } from "./ui/memoryView";
import { frequencyIndicator } from "./ui/frequencyIndicator";
import { RegisterView } from "./ui/registerView";
// Certainly the messiest portion of this program
// Needs to be broken into components
// Breaking up into components has started but has yet to conclude

let delay = 100;

export class UI {
	printout: HTMLElement;

	auto_running: boolean;

	events: UiEventHandler = new UiEventHandler();

	frequencyIndicator: frequencyIndicator;
	memory: MemoryView;
	registers: RegisterView;
	instruction_explainer: InstructionExplainer;

	constructor() {
		for (const [, e_type] of Object.entries(UiEvent)) {
			this.events.register_event(e_type as UiEvent);
		}
		this.events.seal();

		this.memory = new MemoryView($("memory"), this.events);
		this.frequencyIndicator = new frequencyIndicator($("cycles"), this.events);
		this.instruction_explainer = new InstructionExplainer($("instruction_explainer"), this.events);
		this.registers = new RegisterView($("registers"), this.events);

		this.printout = $("printout");

		this.auto_running = false;
		const pp_button = $("pause_play_button");
		if (pp_button === null) {
			throw new Error("Cant find pause_play button");
		}
		pp_button.addEventListener("click", () => {
			if (this.auto_running) {
				this.stop_auto();
				pp_button.textContent = "Starp";
			} else {
				this.start_auto();
				pp_button.textContent = "Storp";
			}
		});
		$("step_button")?.addEventListener("click", () => {
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

	init_events(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Print, (char) => {
			this.printout.textContent = (this.printout.textContent ?? "") + char;
		});
		cpu_events.listen(CpuEvent.Reset, () => {
			this.reset();
		});

		this.registers.init_cpu_events(cpu_events);
		this.frequencyIndicator.init_cpu_events(cpu_events);
		this.memory.init_cpu_events(cpu_events);
		this.instruction_explainer.init_cpu_events(cpu_events);
	}

	reset(): void {
		this.stop_auto();
		this.registers.reset();
		this.frequencyIndicator.reset();
		this.instruction_explainer.reset();
		this.memory.reset();
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
