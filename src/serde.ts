/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */

import { formatHex } from "./etc";
import { u8 } from "./num";

// Serialize<=>Deserialize

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

const line = (buf: string, s: string): void => {
	buf += s;
};

export function serialize(state: ISerializableState): [string, string] {
	const filename = state.filename ? clean_string(state.filename).replaceAll(" ", "_") : "new_program";
	const filename_ext = `${filename}.txt`;
	let out = "";
	{
		// write filename
		out += "FILENAME\n";
		out += filename;
		out += "\n";
	}
	out += "# This is a comment! it is ignored when loading the file\n";
	out += "# Program Bytes\n";
	out += "MEMORY\n";
	for (let i = 0; i < 256; i++) {
		if (i !== 0 && i % 16 === 0) {
			out += "\n";
		}
		const byte = state.memory[i];
		const hex = `0x${formatHex(byte as u8)}`;
		out += `${hex}, `;
	}
	out += "\n";

	if (state.vram) {
		let has_image = false;
		// scan through image to determine if any pixels are colored.
		// avoid exporting empty image
		for (let i = 0; i < 256; i++) has_image ||= state.vram[i] !== 0;
		if (has_image) {
			out += "# Program VRAM\n";
			out += "VRAM\n";
			for (let i = 0; i < 256; i++) {
				if (i !== 0 && i % 16 === 0) {
					out += "\n";
				}
				const byte = state.vram[i];
				const hex = `0x${formatHex(byte as u8)}`;
				out += `${hex}, `;
			}
		}
	}
	return [filename_ext, out];
}

const str =
	"F new_program\
# This is a comment! it is ignored when loading the file# Program Bytes\
MEMORY\
0x19, 0x06, 0x38, 0xFF, 0x06, 0x01, 0x19, 0x06, 0x49, 0xFF, 0x06, 0x01, 0x19, 0x06, 0x57, 0xFF,\
0x06, 0x01, 0x19, 0x06, 0x58, 0xFF, 0x06, 0x01, 0x19, 0x06, 0x59, 0xFF, 0x06, 0x01, 0x21, 0x85,\
0xF0, 0x00, 0x43, 0x00, 0x01, 0xFE, 0x60, 0x33, 0x07, 0x06, 0xFF, 0x5E, 0x06, 0x23, 0x07, 0x20,\
0x21, 0x85, 0x17, 0x07, 0x53, 0x06, 0x11, 0xFD, 0x60, 0x43, 0x00, 0x01, 0x50, 0x70, 0x5E, 0x06,\
0xFD, 0x60, 0x43, 0x00, 0x01, 0x50, 0x70, 0x5E, 0x06, 0xFD, 0x60, 0x43, 0x00, 0x01, 0x50, 0x70,\
0x51, 0x06, 0x0E, 0xFD, 0x60, 0x43, 0x00, 0x01, 0x50, 0x70, 0x51, 0x06, 0x02, 0xFD, 0x60, 0x43,\
0x00, 0x01, 0x50, 0x70, 0x51, 0x06, 0x0E, 0xFD, 0x60, 0x43, 0x00, 0x01, 0x50, 0x70, 0x5E, 0x06,\
0xFD, 0x60, 0x43, 0x00, 0x01, 0x50, 0x70, 0x5E, 0x06, 0xFD, 0x60, 0x43, 0x00, 0x01, 0x50, 0x70,\
0x53, 0x06, 0x11, 0x21, 0x89, 0x17, 0x06, 0x21, 0x32, 0x13, 0x71, 0x17, 0x07, 0xFD, 0x60, 0x43,\
0x00, 0x01, 0x50, 0x70, 0x17, 0x04, 0x23, 0x07, 0x9F, 0x31, 0x04, 0x01, 0x03, 0x21, 0xA7, 0x19,\
0x04, 0x0C, 0x48, 0x41, 0x43, 0x04, 0x01, 0xFD, 0x60, 0x47, 0x04, 0x01, 0x40, 0x04, 0xFE, 0x60,\
0x33, 0x07, 0x06, 0xFF, 0x5E, 0x06, 0x23, 0x07, 0x87, 0x17, 0x06, 0xFD, 0x67, 0x49, 0x07, 0x01,\
0xFE, 0x67, 0x33, 0x07, 0x06, 0xFF, 0x5E, 0x06, 0x23, 0x07, 0xBB, 0x21, 0x85, 0x00, 0x00, 0x00,\
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,\
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,\
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,\
";

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
