/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */

import { formatHex } from "./etc";
import { u8 } from "./num";

// Serialize<=>Deserialize
// Takes some facets of the computer state to be saved to a string (for later sharing)

interface ISerializableState {
	filename?: string;
	vram?: Uint8Array;
	memory: Uint8Array;
}

function clean_string(s: string): string {
	let str = s;
	str = str.replaceAll("\n", " ");
	str = str.trim();
	return str;
}

export function serialize(state: ISerializableState): [string, string] {
	const filename = state.filename ? clean_string(state.filename).replaceAll(" ", "_") : "new_program";
	const filename_ext = `${filename}.txt`;
	let out = "";
	// Write
	const wr = (st: string = ""): void => ((out += st), void 0);
	// Write line
	// eslint-disable-next-line prefer-template
	const ln = (st: string = ""): void => ((out += st + "\n"), void 0);
	ln("# This is a comment! it is ignored when loading the file");

	// write filename
	ln("FILENAME");
	ln(filename);

	ln("# Program Bytes");
	// write memory
	ln("MEMORY");
	for (let i = 0; i < 256; i++) {
		if (i !== 0 && i % 16 === 0) ln();
		const byte = state.memory[i];
		wr(`0x${formatHex(byte as u8)}, `);
	}
	ln();

	// write vram
	if (state.vram) {
		let has_image = false;
		// scan through image to determine if any pixels are colored.
		// avoid exporting empty image
		for (let i = 0; i < 256; i++) has_image ||= state.vram[i] !== 0;
		if (has_image) {
			ln("# Program VRAM");
			ln("VRAM");
			for (let i = 0; i < 256; i++) {
				if (i !== 0 && i % 16 === 0) ln();
				const byte = state.vram[i];
				wr(`0x${formatHex(byte as u8)}, `);
			}
		}
	}
	return [filename_ext, out];
}

const parse_transitions = {
	start: ["filename", "memory"],
	filename: ["after_filename"],
	after_filename: ["memory", "vram"],
	memory: ["after_memory"],
	after_memory: ["vram", "end"],
	vram: ["after_vram"],
	after_vram: ["end"],
};

export function deserialize(s: string): ISerializableState {
	type parse_modes =
		| "start"
		| "filename"
		| "after_filename"
		| "memory"
		| "after_memory"
		| "vram"
		| "after_vram"
		| "end";
	let lines = s.split("\n");
	// trim whitespace
	lines = lines.map((l) => l.trim());
	// remove comments
	lines = lines.filter((l) => l?.[0] !== "#");
	// remove empty lines
	lines = lines.filter((l) => l !== "");
	// lowercase
	lines = lines.map((l) => l.toLowerCase());

	let parse_mode: parse_modes = "start";

	const parsed: ISerializableState = {
		memory: new Uint8Array(256),
	};

	let parsed_mem_bytes = 0;
	let parsed_vram_bytes = 0;
	let i = 0;
	while (parse_mode !== "end") {
		const line = lines[i] ?? "end";
		if (parse_mode === "filename") {
			parsed.filename = line.replaceAll("_", " ");
			parse_mode = "after_filename";
		} else if (parse_mode === "memory") {
			const bytes = line
				.split(",")
				.filter((b) => b !== "")
				.map((b) => b.trim());
			for (const b of bytes) {
				if (b.startsWith("0x")) {
					const n = parseInt(b, 16);
					parsed.memory[parsed_mem_bytes] = n;
					parsed_mem_bytes += 1;
				} else {
					console.error("DESERIALIZE: Invalid byte encountered in memory: ", b);
				}
			}
			if (parsed_mem_bytes >= 256) {
				parse_mode = "after_memory";
			}
		} else if (parse_mode === "vram") {
			if (!parsed.vram) parsed.vram = new Uint8Array(256);
			const bytes = line
				.split(",")
				.map((b) => b.trim())
				.filter((b) => b !== "");
			for (const b of bytes) {
				if (b.startsWith("0x")) {
					const n = parseInt(b, 16);
					parsed.vram[parsed_vram_bytes] = n;
					parsed_vram_bytes += 1;
				} else {
					console.error("DESERIALIZE: Invalid byte encountered in memory: ", b);
				}
			}
			if (parsed_vram_bytes >= 256) {
				parse_mode = "after_vram";
			}
		}

		if (line === "filename" || line === "memory" || line === "vram" || line === "end") {
			if (!parse_transitions[parse_mode].includes(line)) {
				console.warn("DESERIALIZE: Invalid parse transition from ", parse_mode, " to ", line);
			}
			parse_mode = line;
		}

		i += 1;
	}

	console.log(parsed);

	return parsed;
}
