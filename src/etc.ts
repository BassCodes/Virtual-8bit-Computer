// The u8 type represents an unsigned 8bit integer: byte. It does not add any safety, other than as a hint to the programmer.
export type u8 = number;

// Jquery lite
export const $ = (s: string): HTMLElement => document.getElementById(s) as HTMLElement;

export function el(type: string, id?: string): HTMLElement {
	const element = document.createElement(type);
	if (id === undefined) {
		return element;
	}
	element.id = id;
	return element;
}
