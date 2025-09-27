/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
// This file was cobbled together and is the messiest part of this project
// Surprisingly enough, it has been the stablest part of the project — requiring the fewest changes.

import { at } from "../etc";
import { isU8, m256, u8 } from "../num";

const HEX_CHARACTERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

export default class EditorContext {
	private list: Array<HTMLElement>;
	private width: number;
	private height: number;
	private enabled: boolean = false;
	private current_cell_info: { left?: string; right?: string; old?: string };
	private edit_callback: (n: u8, value: u8) => void;
	constructor(list: Array<HTMLElement>, width: number, height: number, callback: (n: u8, value: u8) => void) {
		if (!isU8(width * height - 1)) {
			throw new RangeError("Grid is too big for editor. Maximum area is 256");
		}
		this.list = list;
		this.height = height;
		this.width = width;
		this.edit_callback = callback;
		this.current_cell_info = {};

		for (const [i, cell] of this.list.entries()) {
			cell.setAttribute("spellcheck", "false");
			cell.addEventListener("keydown", (e) => this.keydown(e, i));
			cell.addEventListener("input", (e) => {
				const target = e.target as HTMLElement;
				if (target === null) return;
				const text = target.textContent ?? "";
				if (text.length !== 2) {
					target.textContent = text.substring(0, 2);
				}
			});
			cell.addEventListener("focus", () => {
				if (!this.enabled) return;
				this.current_cell_info.old = cell.textContent ?? "00";
				this.current_cell_info.left = undefined;
				this.current_cell_info.right = undefined;
				cell.classList.add("caret_selected");

				// Reset cursor position (there's an API for this, but this is a simpler, more robust solution)
				cell.textContent = cell.textContent ?? "00";
			});

			cell.addEventListener("blur", () => {
				const left = this.current_cell_info.left;
				const right = this.current_cell_info.right;
				cell.classList.remove("caret_selected");
				if (left === undefined || right === undefined) {
					cell.textContent = this.current_cell_info.old ?? "00";
				} else if (left !== undefined && right !== undefined) {
					const text = `${left}${right}`;
					cell.textContent = text;
					const val = Number.parseInt(text, 16) as u8;
					this.edit_callback(i as u8, val);
					cell.classList.add("recent_edit");
				}
			});
		}
	}

	enable(): void {
		this.enabled = true;
		for (const cell of this.list) {
			cell.setAttribute("contenteditable", "true");
		}
	}
	disable(): void {
		this.enabled = false;
		for (const cell of this.list) {
			cell.removeAttribute("contenteditable");
			cell.blur();
		}
		this.current_cell_info = {};
	}

	private keydown(e: KeyboardEvent, cell_index: number): void {
		if (!this.enabled) return;
		const cell = e.target as HTMLElement;

		const next: null | HTMLElement = this.list[m256(cell_index + 1)];
		const prev: null | HTMLElement = this.list[m256(cell_index - 1)];
		const up: null | HTMLElement = this.list[m256(cell_index - this.width)];
		const down: null | HTMLElement = this.list[m256(cell_index + this.width)];

		const k = e.key;
		if (k === "ArrowUp") {
			(up ?? prev)?.focus();
			cell.blur();
		} else if (k === "ArrowDown") {
			(down ?? next)?.focus();
			cell.blur();
		} else if (k === "ArrowLeft" || k === "Backspace") {
			prev?.focus();
			cell.blur();
		} else if (k === "ArrowRight") {
			next?.focus();
			cell.blur();
		} else if (k === "Enter") {
			cell.blur();
		} else if (k === "Escape") {
			cell.blur();
			return;
		} else if (HEX_CHARACTERS.includes(k.toUpperCase())) {
			if (this.current_cell_info.left === undefined) {
				this.current_cell_info.left = k.toUpperCase();
				cell.innerHTML = `<span class="pending_edit">${this.current_cell_info.left}</span>0`;
			} else if (this.current_cell_info.right === undefined) {
				this.current_cell_info.right = k.toUpperCase();
				cell.textContent = `${this.current_cell_info.left}${this.current_cell_info.right}`;
				next?.focus();
				cell.blur();
			}
		} else if (k === "Tab") {
			return;
		}
		e.preventDefault();
	}
}
