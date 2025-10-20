/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
// This file was cobbled together and is the messiest part of this project
// Surprisingly enough, it has been the stablest part of the project — requiring the fewest changes.

import { at, formatHex } from "../etc";
import { isU8, m256, u8 } from "../num";

const HEX_CHARACTERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

export default class EditorContext {
	private list: Array<HTMLElement>;
	private width: number;
	private height: number;
	private enabled: boolean = false;
	private cursor_position: u8 | null = null;
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
				this.cursor_position = i as u8;

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
		this.setCursorPosition(0);
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

		const k = e.key;
		if (k === "ArrowUp") {
			cell.blur();
			this.setCursorPosition(m256(cell_index - 16));
		} else if (k === "ArrowDown") {
			this.setCursorPosition(m256(cell_index + 16));
			cell.blur();
		} else if (k === "ArrowLeft" || k === "Backspace") {
			this.setCursorPosition(m256(cell_index - 1));
			cell.blur();
		} else if (k === "ArrowRight") {
			this.setCursorPosition(m256(cell_index + 1));
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
				this.setCursorPosition(m256(cell_index + 1));
				cell.blur();
			}
		} else if (k === "Tab") {
			return;
		}
		e.preventDefault();
	}

	getCursorPosition(): u8 | null {
		return this.cursor_position;
	}

	setCursorPosition(n: u8 | null): void {
		if (n === null) {
			if (this.cursor_position !== null) {
				const cell: HTMLElement = this.list[this.cursor_position];
				cell.blur();
			}
			this.cursor_position = null;
			return;
		}
		this.cursor_position = n;
		const cell: HTMLElement = this.list[n];
		cell.focus();
	}

	setCellValue(cell: u8, byte: u8): void {
		const hex = formatHex(byte);
		const old_text = this.list[cell].textContent;
		this.list[cell].textContent = hex;
		if (old_text !== hex) {
			this.list[cell].classList.add("recent_edit");
		}
		this.edit_callback(cell, byte);
	}

	insertByte(pos: u8, dump: Uint8Array): void {
		// It's hacky that we have to pass the dump.
		for (let i = 255; i > pos; i--) {
			this.setCellValue(i as u8, dump[i - 1] as u8);
		}
		this.setCellValue(pos, 0);
		this.setCursorPosition(pos);
	}
	deleteByte(pos: u8, dump: Uint8Array): void {
		for (let i = pos; i < 255; i++) {
			this.setCellValue(i as u8, dump[i + 1] as u8);
		}
		this.setCellValue(255, 0);
		this.setCursorPosition(pos);
	}
}
