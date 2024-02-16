// The u8 type represents an unsigned 8bit integer: byte. It does not add any safety, other than as a hint to the programmer.
export type u8 = number;

// Jquery lite
export const $ = (s: string): HTMLElement => document.getElementById(s) as HTMLElement;

export const format_hex = (n: number): string => n.toString(16).toUpperCase().padStart(2, "0");

export const byte_array_to_js_source = (a: Array<u8>): string => {
	let str = "[";
	for (const b of a) {
		str += `0x${format_hex(b)},`;
	}
	str += "]";
	return str;
};

export function el(type: string, id?: string): HTMLElement {
	const element = document.createElement(type);
	if (id === undefined) {
		return element;
	}
	element.id = id;
	return element;
}
