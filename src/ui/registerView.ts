import { el, format_hex } from "../etc";
import { CpuEvent, CpuEventHandler, UiEventHandler } from "../events";
import { u8 } from "../num.js";
import { UiComponent } from "./uiComponent";

type MemoryCell = {
	el: HTMLDivElement;
};

const REGISTER_COUNT = 8;

export class RegisterView implements UiComponent {
	element: HTMLElement;
	cells: Array<MemoryCell> = [];
	program_counter: number = 0;
	events: UiEventHandler;
	constructor(element: HTMLElement, e: UiEventHandler) {
		this.element = element;
		this.events = e;
		for (let i = 0; i < REGISTER_COUNT; i++) {
			const mem_cell_el = el("div");
			mem_cell_el.textContent = "00";
			element.appendChild(mem_cell_el);
			const mem_cell = { el: mem_cell_el, tags: [] };
			this.cells.push(mem_cell);
		}
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

	reset(): void {
		for (let i = 0; i < REGISTER_COUNT; i++) {
			this.cells[i].el.textContent = "00";
			this.cells[i].el.className = "";
		}
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => {
			this.set_cell_value(register_no, value);
		});
	}
}
