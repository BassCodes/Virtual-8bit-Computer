import { el, format_hex } from "../etc";
import { CpuEvent, CpuEventHandler, UiEventHandler } from "../events";
import { ParamType } from "../instructionSet";
import { u8 } from "../num.js";
import { UiComponent } from "./uiComponent";

type MemoryCell = {
	el: HTMLDivElement;
};

export class MemoryView implements UiComponent {
	element: HTMLElement;
	cells: Array<MemoryCell> = [];
	program_counter: number = 0;
	events: UiEventHandler;
	constructor(element: HTMLElement, e: UiEventHandler) {
		this.element = element;
		this.events = e;
		for (let i = 0; i < 256; i++) {
			const mem_cell_el = el("div");
			mem_cell_el.textContent = "00";
			element.appendChild(mem_cell_el);
			const mem_cell = { el: mem_cell_el, tags: [] };
			this.cells.push(mem_cell);
		}
		this.set_program_counter(0);
	}

	add_cell_class(address: u8, ...css_class: string[]): void {
		for (const str of css_class) {
			this.cells[address].el.classList.add(str);
		}
	}

	remove_cell_class(address: u8, ...css_class: string[]): void {
		for (const str of css_class) {
			this.cells[address].el.classList.remove(str);
		}
	}

	remove_all_cell_class(css_class: string): void {
		for (const cell of this.cells) {
			cell.el.classList.remove(css_class);
		}
	}

	add_cell_class_exclusive(address: u8, css_class: string): void {
		this.remove_all_cell_class(css_class);
		this.add_cell_class(address, css_class);
	}

	set_cell_value(address: u8, value: u8): void {
		this.cells[address].el.textContent = format_hex(value);
	}

	set_program_counter(position: number): void {
		this.cells[this.program_counter].el.classList.remove("program_counter");
		this.cells[position].el.classList.add("program_counter");
		this.program_counter = position;
	}

	reset(): void {
		for (let i = 0; i < 256; i++) {
			this.cells[i].el.textContent = "00";
			this.cells[i].el.className = "";
		}
		this.set_program_counter(0);
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.MemoryChanged, ({ address, value }) => {
			this.set_cell_value(address, value);
		});
		c.listen(CpuEvent.ProgramCounterChanged, ({ counter }) => {
			this.set_program_counter(counter);
		});
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.add_cell_class(pos, "instruction_argument");
			const t = param.type;
			this.remove_cell_class(pos, "constant", "register", "memory", "instruction", "invalid");
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
			this.add_cell_class(pos, name);
		});
		c.listen(CpuEvent.InstructionParsed, ({ instr, code, pos }) => {
			this.remove_all_cell_class("instruction_argument");
			this.remove_all_cell_class("current_instruction");
			this.add_cell_class(pos, "current_instruction");
			this.remove_cell_class(pos, "constant", "register", "memory", "invalid");
			this.add_cell_class(pos, "instruction");
		});
		c.listen(CpuEvent.InvalidParsed, ({ code, pos }) => {
			this.remove_cell_class(pos, "constant", "register", "memory", "instruction");
			this.add_cell_class(pos, "invalid");
		});
	}
}
