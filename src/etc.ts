/**
 * @file Assorted small functions to be used throughout this program.
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { u8 } from "./num";

/**
 * Alias to `document.getElementById(id)`. Jquery lite.
 * @param id id of element to be located in DOM
 */
export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export const format_hex = (n: u8): string => n.toString(16).toUpperCase().padStart(2, "0");

/**
 * Converts array of bytes to a JavaScript syntax array of hexadecimal literals
 * @param bytes
 */
export const byte_array_to_js_source = (bytes: Array<u8>): string => {
	let str = "[";
	for (const b of bytes) {
		str += `0x${format_hex(b)},`;
	}
	str += "]";
	return str;
};

/**
 * Create an html element
 * @param type
 * @param id id attribute to set
 */
export function el<E extends keyof HTMLElementTagNameMap>(type: E, id?: string): HTMLElementTagNameMap[E];
export function el(type: string, id?: string): HTMLElement | undefined {
	const element = document.createElement(type);
	if (id === undefined) {
		return element;
	}
	element.id = id;
	return element;
}

export type NonEmptyArray<T> = T[] & { 0: T };

export const SVG_NS = "http://www.w3.org/2000/svg";
