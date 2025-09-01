/**
 * @file Abstract implementation of a grid of (up to) 256 items or less
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { NonEmptyArray, el, formatHex } from "../etc";
import { u8 } from "../num";
import EditorContext from "./editableHex";

interface GenericCell {
	el: HTMLElement;
}

export default class CelledViewer {
	cells: Array<GenericCell> = [];
	readonly width: number;
	readonly height: number;
	container: HTMLElement;
	editor: EditorContext;
	constructor(width: number, height: number, element: HTMLElement, edit_callback: (address: u8, value: u8) => void) {
		this.container = element;
		this.width = width;
		this.height = height;

		this.container.classList.add("celled_viewer");
		for (let i = 0; i < this.width * this.height; i++) {
			const mem_cell_el = el("div").fin();
			mem_cell_el.append("0", "0");
			this.container.appendChild(mem_cell_el);
			const mem_cell = { el: mem_cell_el };
			this.cells.push(mem_cell);
		}
		const list = this.cells.map((c) => c.el);

		this.editor = new EditorContext(list, this.width, this.height, (address, value) => {
			edit_callback(address, value);
		});
	}

	reset(): void {
		for (let i = 0; i < this.height * this.width; i++) {
			this.setCellValue(i as u8, 0);
			this.cells[i].el.className = "";
		}
	}
	addCellClass(address: u8, ...css_class: NonEmptyArray<string>): void {
		for (const str of css_class) {
			this.cells[address].el.classList.add(str);
		}
	}

	removeCellClass(address: u8, ...css_class: NonEmptyArray<string>): void {
		for (const str of css_class) {
			this.cells[address].el.classList.remove(str);
		}
	}

	removeAllCellClass(css_class: string): void {
		for (const cell of this.cells) {
			cell.el.classList.remove(css_class);
		}
	}

	clearAllClasses(): void {
		for (const cell of this.cells) {
			cell.el.className = "";
		}
	}

	addCellClassExclusive(address: u8, css_class: string): void {
		this.removeAllCellClass(css_class);
		this.addCellClass(address, css_class);
	}

	setCellValue(address: u8, value: u8): void {
		const str = formatHex(value);
		const a = str[0];
		const b = str[1];
		this.cells[address].el.textContent = "";
		this.cells[address].el.append(a, b);
	}
}
