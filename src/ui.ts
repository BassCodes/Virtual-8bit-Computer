import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { $, el, format_hex } from "./etc";
import { EventHandler } from "./eventHandler";
import { InstructionExplainer } from "./ui/instructionExplainer";
import { MemoryView } from "./ui/memoryView";
import { ParamType } from "./instructionSet";
import { frequencyIndicator } from "./ui/frequencyIndicator";
// Certainly the messiest portion of this program
// Needs to be broken into components

let delay = 100;

export class UI {
	registers: HTMLElement;
	printout: HTMLElement;
	register_cells: Array<HTMLElement> = [];

	auto_running: boolean;

	events: UiEventHandler = new EventHandler<UiEvent>() as UiEventHandler;

	frequencyIndicator: frequencyIndicator;
	memory: MemoryView;
	instruction_explainer: InstructionExplainer;

	constructor() {
		for (const [, e_type] of Object.entries(UiEvent)) {
			this.events.register_event(e_type as UiEvent);
		}
		this.events.seal();

		this.memory = new MemoryView($("memory"));
		this.frequencyIndicator = new frequencyIndicator($("cycles"));

		this.instruction_explainer = new InstructionExplainer($("instruction_explainer"));

		this.printout = $("printout");

		const registers = $("registers");
		for (let i = 0; i < 8; i++) {
			const reg_cell = el("div", `r_${i}`);
			reg_cell.textContent = "00";
			registers.appendChild(reg_cell);
			this.register_cells.push(reg_cell);
		}

		this.registers = registers;

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
		cpu_events.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => {
			this.register_cells[register_no].textContent = format_hex(value);
		});
		cpu_events.listen(CpuEvent.Print, (char) => {
			this.printout.textContent = (this.printout.textContent ?? "") + char;
		});

		this.frequencyIndicator.init_cpu_events(cpu_events);
		this.memory.init_cpu_events(cpu_events);
		this.instruction_explainer.init_cpu_events(cpu_events);
	}

	reset(): void {
		this.stop_auto();
		this.register_cells.forEach((r) => {
			r.textContent = "00";
		});
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
