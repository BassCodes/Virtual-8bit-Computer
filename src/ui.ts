import { ComputerState } from "./computer";
import { $, el } from "./etc";

export class UI {
	container: HTMLElement;
	program_memory: HTMLElement;
	program_memory_cells: Array<HTMLElement>;
	registers: HTMLElement;
	register_cells: Array<HTMLElement>;
	step_func: null | (() => void);
	auto_running: boolean;
	constructor(parent: HTMLElement) {
		this.container = parent;

		const program_mem = el("div", "program_memory");
		this.program_memory_cells = [];
		for (let i = 0; i < 256; i++) {
			const mem_cell = el("div", `p_${i}`);
			mem_cell.textContent = "0x00";
			program_mem.appendChild(mem_cell);
			this.program_memory_cells.push(mem_cell);
		}
		this.program_memory_cells[0].classList.add("div", "program_counter");
		this.program_memory = program_mem;

		this.register_cells = [];
		const registers = el("div", "registers");
		for (let i = 0; i < 8; i++) {
			const reg_cell = el("div", `R_${i}`);
			reg_cell.textContent = "00";
			// reg_cell.setAttribute("contenteditable", "true");
			// reg_cell.setAttribute("spellcheck", "false");
			registers.appendChild(reg_cell);
			this.register_cells.push(reg_cell);
		}
		// // eslint-disable-next-line prefer-arrow-callback
		// registers.addEventListener("input", function (e) {
		// 	const allowed_chars = "0123456789ABCDEFG";
		// 	const r = e.target as HTMLElement;
		// 	let data = (r.textContent as string).toUpperCase();

		// 	for (let i = 0; i < data.length; i++) {
		// 		if (!allowed_chars.includes(data[i])) {
		// 			data = "00";
		// 			break;
		// 		}
		// 	}

		// 	e.preventDefault();
		// 	return false;
		// });

		// registers.addEventListener("keydown", (e) => {
		// 	if (e.key === "Enter") {
		// 		e.preventDefault();
		// 		(e.target as HTMLElement).blur();
		// 	}
		// });
		// registers.addEventListener("blur", (e) => {
		// 	const allowed_chars = "0123456789ABCDEFG";
		// 	const r = e.target as HTMLElement;
		// 	const data = (r.textContent as string).toUpperCase();
		// });

		this.registers = registers;

		this.container.append(registers, program_mem);
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
		for (let i = 0; i < 256; i++) {
			const current = this.program_memory_cells[i];
			current.className = "";
			current.textContent = state.memory[i].toString(16).toUpperCase().padStart(2, "0");
		}
		this.program_memory_cells[state.program_counter].classList.add("program_counter");
		const current_instr = state.current_instruction;
		if (current_instr !== null) {
			this.program_memory_cells[current_instr.pos].classList.add("current_instruction");
			for (let i = 0; i < current_instr.params_found; i++) {
				const offset = i + 1 + current_instr.pos;
				this.program_memory_cells[offset].classList.add("instruction_argument");
			}
		}
		for (let i = 0; i < state.registers.length; i++) {
			const new_text = state.registers[i].toString(16).toUpperCase().padStart(2, "0");
			const old = this.register_cells[i].textContent;
			if (new_text !== old) {
				this.register_cells[i].textContent = new_text;
			}
		}
	}
}
