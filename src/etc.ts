/**
 * @file Assorted small functions to be used throughout this program.
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import el from "./util/elementMaker";
// Re-export el
export { el };
import { u8 } from "./num";

/**
 * Alias to `document.getElementById(id)`. Jquery lite.
 * @param id id of element to be located in DOM
 */
export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export const formatHex = (n: u8): string => n.toString(16).toUpperCase().padStart(2, "0");

/**
 * Converts array of bytes to a JavaScript syntax array of hexadecimal literals
 * @param bytes
 */
export const byteArrayToJsSource = (bytes: Array<u8>): string => {
	let str = "[";
	for (const b of bytes) {
		str += `0x${formatHex(b)},`;
	}
	str += "]";
	return str;
};

export type NonEmptyArray<T> = T[] & { 0: T };

export const SVG_NS = "http://www.w3.org/2000/svg";

export function inRange(check: number, start: number, end: number): boolean {
	if (check >= start && check <= end) return true;
	return false;
}

/**
 * Gets the `i`th element in a list. Negative indices return null.
 * Out of range indices return null
 */
export function at<T>(l: Array<T>, i: number): T | null {
	if (i < 0) {
		return null;
	}
	if (i >= l.length) {
		return null;
	}
	return l[i];
}
