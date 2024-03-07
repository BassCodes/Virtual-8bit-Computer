/**
 * @file Abstract implementation of a grid of (up to) 256 items or less
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { NonEmptyArray, el, format_hex } from "../etc";
import { u8 } from "../num";

interface GenericCell {
	el: HTMLElement;
}

export abstract class CelledViewer {
	cells: Array<GenericCell> = [];
	width: number;
	height: number;
	element: HTMLElement;
	constructor(width: number, height: number, element: HTMLElement) {
		this.element = element;
		this.width = width;
		this.height = height;
		this.element.classList.add("celled_viewer");
		for (let i = 0; i < this.width * this.height; i++) {
			const mem_cell_el = el("div");
			mem_cell_el.append("0", "0");
			this.element.appendChild(mem_cell_el);
			const mem_cell = { el: mem_cell_el };
			this.cells.push(mem_cell);
		}
	}

	reset(): void {
		for (let i = 0; i < this.height * this.width; i++) {
			this.set_cell_value(i as u8, 0);
			this.cells[i].el.className = "";
		}
	}
	add_cell_class(address: u8, ...css_class: NonEmptyArray<string>): void {
		for (const str of css_class) {
			this.cells[address].el.classList.add(str);
		}
	}

	remove_cell_class(address: u8, ...css_class: NonEmptyArray<string>): void {
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
		const str = format_hex(value);
		const a = str[0];
		const b = str[1];
		this.cells[address].el.textContent = "";
		this.cells[address].el.append(a, b);
	}
}
