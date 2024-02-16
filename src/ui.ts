import { ComputerState } from "./computer";
import { CpuEvent, MemoryCellType } from "./events";
import { $, el, u8 } from "./etc";
import { EventHandler } from "./eventHandler";

export class UI {
	container: HTMLElement;
	program_memory: HTMLElement;
	program_memory_cells: Array<HTMLElement>;
	registers: HTMLElement;
	register_cells: Array<HTMLElement>;
	step_func: null | (() => void);

	program_counter: u8;

	auto_running: boolean;
	constructor(parent: HTMLElement, cpu_events: EventHandler<CpuEvent>) {
		this.container = parent;
		this.program_counter = 0;
		const program_mem = $("memory");
		this.program_memory_cells = [];
		for (let i = 0; i < 256; i++) {
			const mem_cell = el("div", `p_${i}`);
			mem_cell.textContent = "00";
			program_mem.appendChild(mem_cell);
			this.program_memory_cells.push(mem_cell);
		}
		this.program_memory_cells[0].classList.add("div", "program_counter");
		this.program_memory = program_mem;

		this.register_cells = [];
		const registers = $("registers");
		for (let i = 0; i < 8; i++) {
			const reg_cell = el("div", `R_${i}`);
			reg_cell.textContent = "00";
			registers.appendChild(reg_cell);
			this.register_cells.push(reg_cell);
		}

		this.registers = registers;

		this.step_func = null;
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
		document.getElementById("step_button")?.addEventListener("click", () => {
			if (this.auto_running) {
				this.stop_auto();
			}
			if (this.step_func === null) {
				return;
			}
			this.step_func();
		});

		cpu_events.add_listener(CpuEvent.MemoryChanged, (e) => {
			const { address, value } = e as { address: u8; value: u8 };
			this.program_memory_cells[address].textContent = value.toString(16).toUpperCase().padStart(2, "0");
		});
		cpu_events.add_listener(CpuEvent.RegisterChanged, (e) => {
			const { register_no, value } = e as { register_no: u8; value: u8 };
			this.register_cells[register_no].textContent = value.toString(16).toUpperCase().padStart(2, "0");
		});
		cpu_events.add_listener(CpuEvent.ProgramCounterChanged, (e) => {
			const { counter } = e as { counter: u8 };
			this.program_memory_cells[this.program_counter].classList.remove("program_counter");
			this.program_memory_cells[counter].classList.add("program_counter");
			this.program_counter = counter;
		});
		cpu_events.add_listener(CpuEvent.Print, (e) => {
			const { data } = e as { data: u8 };
			const printout = $("printout");
			if (printout === null) {
				throw new Error("Couldn't get printout");
			}
			printout.textContent = (printout.textContent ?? "") + data;
		});
		cpu_events.add_listener(CpuEvent.Reset, () => {
			this.stop_auto();
			this.program_memory_cells.forEach((c) => {
				c.className = "";
				c.textContent = "00";
			});
			this.register_cells.forEach((r) => {
				r.textContent = "00";
			});
			this.program_counter = 0;
		});

		const map: Map<MemoryCellType, string> = new Map();

		map.set(MemoryCellType.Constant, "constant");
		map.set(MemoryCellType.Instruction, "instruction");
		map.set(MemoryCellType.InvalidInstruction, "invalid_instruction");
		map.set(MemoryCellType.Memory, "memory");
		map.set(MemoryCellType.Register, "register");
		cpu_events.add_listener(CpuEvent.MemoryByteParsed, (e) => {
			const { type, pos } = e as { type: MemoryCellType; pos: u8 };
			const css_class = map.get(type);
			if (css_class === undefined) {
				throw new Error("Something went wrong");
			}
			for (const other_class of map.values()) {
				if (other_class === css_class) continue;
				this.program_memory_cells[pos].classList.remove(other_class);
			}
			this.program_memory_cells[pos].classList.add(css_class);
		});
	}

	start_auto(speed: number = 200): void {
		if (this.step_func === null) {
			return;
		}
		if (this.auto_running) {
			return;
		}
		this.auto_running = true;
		const loop = (): void => {
			if (this.step_func === null) {
				this.auto_running = false;
				return;
			}
			if (this.auto_running === false) {
				return;
			}
			this.step_func();
			setTimeout(loop, speed);
			// requestAnimationFrame(loop);
		};
		loop();
	}

	stop_auto(): void {
		this.auto_running = false;
	}

	set_step_func(f: () => void): void {
		this.step_func = f;
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
