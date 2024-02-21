// eslint-disable-next-line @typescript-eslint/no-explicit-any
function set_caret(el: any, pos: number): boolean {
	const selection = window.getSelection();
	const range = document.createRange();
	if (selection === null) {
		return false;
	}

	selection.removeAllRanges();
	range.selectNode(el);

	range.setStart(el, pos);
	range.setEnd(el, pos);
	range.collapse(true);
	selection.removeAllRanges();
	selection.addRange(range);
	el.focus();
	return true;
}

function get_caret(el: HTMLElement): null | number {
	const sel = window.getSelection();
	if (sel === null) {
		return null;
	}
	const pos = sel.getRangeAt(0).startOffset;
	const endPos = pos + Array.from(el.innerHTML.slice(0, pos)).length - el.innerHTML.slice(0, pos).split("").length;
	return endPos;
}

const hex_characters = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
function replace_non_hex(c: string): string {
	if (hex_characters.includes(c)) {
		return c;
	}
	return "0";
}

function editable_constraints(e: Event): boolean {
	const target = e.target as HTMLDivElement;
	const text = target.innerHTML ?? "";
	if (text.length !== 2) {
		const pos = get_caret(target);
		const new_str = [...(target.textContent ?? "").substring(0, 2).padStart(2, "0").toUpperCase()]
			.map(replace_non_hex)
			.join("");
		target.innerHTML = "";
		// For the caret selection to work right, each character must be its own node, complicating this greatly
		target.append(new_str.substring(0, 1), new_str.substring(1));

		if (pos !== null) {
			if (pos >= 2) {
				return true;
			}
			set_caret(target, pos);
		}
	}
	return false;
}

function at<T>(l: Array<T>, i: number): T | null {
	if (i < 0) {
		return null;
	}
	if (i >= l.length) {
		return null;
	}
	return l[i];
}

export function make_editable(
	list: Array<HTMLElement>,
	width: number,
	height: number,
	on_edit: (n: number, value: string) => void
): void {
	for (const [i, cell] of list.entries()) {
		cell.setAttribute("contenteditable", "true");
		cell.setAttribute("spellcheck", "false");
		const next: null | HTMLElement = at(list, i + 1);
		const prev: null | HTMLElement = at(list, i - 1);
		const up: null | HTMLElement = at(list, i - width);
		const down: null | HTMLElement = at(list, i + width);
		cell.addEventListener("keydown", (e) => {
			const caret_position = get_caret(cell);
			const k = e.key;
			if (k === "ArrowUp") {
				(up ?? prev)?.focus();
				cell.blur();
			} else if (k === "ArrowDown") {
				(down ?? next)?.focus();
				cell.blur();
			} else if ((k === "ArrowLeft" || k === "Backspace") && caret_position === 0) {
				prev?.focus();
				cell.blur();
			} else if (k === "ArrowRight" && caret_position === 1) {
				next?.focus();
				cell.blur();
			} else if (k === "Enter") {
				cell.blur();
			} else if (k === "Escape") {
				cell.blur();
				return;
			} else {
				return;
			}
			e.preventDefault();
		});
		let previous_text = cell.textContent ?? "";
		cell.addEventListener("input", (e) => {
			const current_text = cell.textContent ?? "";
			if (current_text !== previous_text) {
				previous_text = cell.textContent ?? "";
				on_edit(i, current_text);
			}
			if (editable_constraints(e) === true) {
				next?.focus();
				cell.blur();
			}
		});
	}
}
