import { el, format_hex, u8 } from "../etc";
import { CpuEventHandler, UiEventHandler } from "../events";
import { UiComponent } from "./uiComponent";

export enum CellTag {
	ProgramCounter = "program_counter",
}

type MemoryCell = {
	el: HTMLElement;
};

export class MemoryView implements UiComponent {
	element: HTMLElement;
	cells: Array<MemoryCell> = [];
	program_counter: number = 0;
	constructor(element: HTMLElement) {
		this.element = element;
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
		this.element.innerHTML = "";
		for (let i = 0; i < 256; i++) {
			const mem_cell_el = el("div");
			mem_cell_el.textContent = "00";
			this.element.appendChild(mem_cell_el);
			const mem_cell = { el: mem_cell_el };
			this.cells.push(mem_cell);
		}
		this.set_program_counter(0);
	}

	init_events(eh: UiEventHandler): void {
		this;
	}
	init_cpu_events(c: CpuEventHandler) {}
}
