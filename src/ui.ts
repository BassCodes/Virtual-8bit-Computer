import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { $, el, format_hex, u8 } from "./etc";
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
		cpu_events.listen(CpuEvent.MemoryChanged, ({ address, value }) => {
			this.memory.set_cell_value(address, value);
		});
		cpu_events.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => {
			this.register_cells[register_no].textContent = format_hex(value);
		});
		cpu_events.listen(CpuEvent.ProgramCounterChanged, ({ counter }) => {
			this.memory.set_program_counter(counter);
		});
		cpu_events.listen(CpuEvent.Print, (char) => {
			this.printout.textContent = (this.printout.textContent ?? "") + char;
		});
		cpu_events.listen(CpuEvent.Reset, () => {
			this.reset();
		});

		this.frequencyIndicator.init_cpu_events(cpu_events);
		this.memory.init_cpu_events(cpu_events);
		this.instruction_explainer.init_cpu_events(cpu_events);

		cpu_events.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.memory.add_cell_class(pos, "instruction_argument");
			this.instruction_explainer.add_param(param, pos, code);
			const t = param.type;
			this.memory.remove_cell_class(pos, "constant", "register", "memory", "instruction", "invalid");
			let name: string = "";
			if (t === ParamType.Const) {
				name = "constant";
			} else if (t === ParamType.Memory) {
				name = "memory";
			} else if (t === ParamType.Register) {
				name = "register";
			} else {
				throw new Error("unreachable");
			}
			this.memory.add_cell_class(pos, name);
		});
		cpu_events.listen(CpuEvent.InstructionParsed, ({ instr, code, pos }) => {
			this.instruction_explainer.add_instruction(instr, pos, code);

			this.memory.remove_all_cell_class("instruction_argument");
			this.memory.remove_all_cell_class("current_instruction");
			this.memory.add_cell_class(pos, "current_instruction");
			this.memory.remove_cell_class(pos, "constant", "register", "memory", "invalid");
			this.memory.add_cell_class(pos, "instruction");
		});
		cpu_events.listen(CpuEvent.InvalidParsed, ({ code, pos }) => {
			this.memory.remove_cell_class(pos, "constant", "register", "memory", "instruction");
			this.memory.add_cell_class(pos, "invalid");
			this.instruction_explainer.add_invalid(pos, code);
		});
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
