import { ComputerState } from "./computer";
import { CpuEvent, CpuEventHandler, MemoryCellType, UiEvent, UiEventHandler } from "./events";
import { $, el, format_hex, u8 } from "./etc";
import { Instruction, ParameterType } from "./instructionSet";
import { EventHandler } from "./eventHandler";

export class UI {
	container: HTMLElement;
	program_memory: HTMLElement;
	program_memory_cells: Array<HTMLElement> = [];
	registers: HTMLElement;
	printout: HTMLElement;
	instruction_explainer: HTMLElement;
	register_cells: Array<HTMLElement> = [];
	instruction_parsing_addresses: Array<u8> = [];
	program_counter: u8 = 0;

	auto_running: boolean;

	events: UiEventHandler = new EventHandler<UiEvent>() as UiEventHandler;

	constructor(parent: HTMLElement) {
		for (const [, e_type] of Object.entries(UiEvent)) {
			this.events.register_event(e_type as UiEvent);
		}
		this.events.seal();
		this.container = parent;
		this.printout = $("printout");
		this.instruction_explainer = $("instruction_explainer");
		const program_mem = $("memory");
		for (let i = 0; i < 256; i++) {
			const mem_cell = el("div", `p_${i}`);
			mem_cell.textContent = "00";
			program_mem.appendChild(mem_cell);
			this.program_memory_cells.push(mem_cell);
		}
		this.program_memory_cells[0].classList.add("div", "program_counter");
		this.program_memory = program_mem;

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

			this.events.dispatch(UiEvent.RequestCpuCycle, null);
		});
	}

	init_events(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.MemoryChanged, ({ address, value }) => {
			this.program_memory_cells[address].textContent = format_hex(value);
		});
		cpu_events.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => {
			this.register_cells[register_no].textContent = format_hex(value);
		});
		cpu_events.listen(CpuEvent.ProgramCounterChanged, ({ counter }) => {
			this.program_memory_cells[this.program_counter].classList.remove("program_counter");
			this.program_memory_cells[counter].classList.add("program_counter");
			this.program_counter = counter;
		});
		cpu_events.listen(CpuEvent.Print, (char) => {
			this.printout.textContent = (this.printout.textContent ?? "") + char;
		});
		cpu_events.listen(CpuEvent.Reset, () => {
			this.reset();
		});

		const map: Map<MemoryCellType, string> = new Map();

		map.set(MemoryCellType.Constant, "constant");
		map.set(MemoryCellType.Instruction, "instruction");
		map.set(MemoryCellType.InvalidInstruction, "invalid_instruction");
		map.set(MemoryCellType.Memory, "memory");
		map.set(MemoryCellType.Register, "register");
		cpu_events.listen(CpuEvent.MemoryByteParsed, (e) => {
			const { type, pos, code } = e;
			const css_class = map.get(type);
			if (css_class === undefined) {
				throw new Error("Something went wrong");
			}
			for (const other_class of map.values()) {
				if (other_class === css_class) continue;
				this.program_memory_cells[pos].classList.remove(other_class);
			}
			if (type === MemoryCellType.Instruction) {
				while (this.instruction_parsing_addresses.length > 0) {
					const num = this.instruction_parsing_addresses.pop();
					if (num === undefined) {
						throw new Error("Shouldn't happen");
					}
					this.program_memory_cells[num].classList.remove("instruction_argument");
					this.program_memory_cells[num].classList.remove("current_instruction");
				}
				this.instruction_explainer.innerHTML = "";
				const { instr } = e as { instr: Instruction };
				this.program_memory_cells[pos].classList.add("current_instruction");
				this.instruction_parsing_addresses.push(pos);
				const instr_box = el("div", "expl_box");
				const instr_icon = el("span", "expl_icon");
				instr_icon.classList.add(css_class);
				instr_icon.setAttribute("title", css_class.toUpperCase());
				instr_icon.textContent = format_hex(code);
				const instr_box_text = el("span", "expl_text");
				instr_box_text.textContent = `${instr.name}`;
				instr_box.appendChild(instr_icon);
				instr_box.appendChild(instr_box_text);
				this.instruction_explainer.appendChild(instr_box);
			} else if (type !== MemoryCellType.InvalidInstruction) {
				const { param } = e as { param: ParameterType };
				this.program_memory_cells[pos].classList.add("instruction_argument");
				this.instruction_parsing_addresses.push(pos);
				const instr_box = el("div", "expl_box");
				const instr_icon = el("span", "expl_icon");
				instr_icon.classList.add(css_class);
				instr_icon.setAttribute("title", css_class.toUpperCase());
				instr_icon.textContent = format_hex(code);
				const instr_box_text = el("span", "expl_text");
				instr_box_text.textContent = `${param.desc}`;
				instr_box.appendChild(instr_icon);
				instr_box.appendChild(instr_box_text);
				this.instruction_explainer.appendChild(instr_box);
			}
			this.program_memory_cells[pos].classList.add(css_class);
		});

		cpu_events.listen(CpuEvent.InstructionExecuted, ({ instr }) => {});
	}

	reset(): void {
		this.stop_auto();
		this.program_memory_cells.forEach((c) => {
			c.className = "";
			c.textContent = "00";
		});
		this.register_cells.forEach((r) => {
			r.textContent = "00";
		});
		this.program_counter = 0;
		this.program_memory_cells[0].classList.add("program_counter");
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
			this.events.dispatch(UiEvent.RequestCpuCycle, null);
			setTimeout(loop, speed);
			// requestAnimationFrame(loop);
		};
		loop();
	}

	stop_auto(): void {
		this.auto_running = false;
	}

	state_update_event(state: ComputerState): void {
		const current_instr = state.current_instruction;
		if (current_instr !== null) {
			this.program_memory_cells[current_instr.pos].classList.add("current_instruction");
			for (let i = 0; i < current_instr.params_found; i++) {
				const offset = i + 1 + current_instr.pos;
				this.program_memory_cells[offset].classList.add("instruction_argument");
			}
		}
	}
}
