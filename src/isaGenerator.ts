import { format_hex } from "./etc";
import { Instruction, InstructionSet } from "./instructionSet";
import { u8 } from "./num.js";

export function generate_isa(iset: InstructionSet): string {
	const instructions: Array<[u8, Instruction]> = [];

	for (const kv of iset.instructions.entries()) instructions.push(kv);

	let output_string = "INSTRUCTIONS\n";

	const max_instr_name_len = instructions.map((i) => i[1].name.length).reduce((acc, p) => Math.max(p, acc), 0);
	instructions.sort((a, b) => a[0] - b[0]);

	for (const instruction of instructions) {
		const hex_code = format_hex(instruction[0]);
		const short_description = instruction[1].name.padEnd(max_instr_name_len, " ");
		const parameter_count = instruction[1].params.length;
		const description = instruction[1].desc;
		output_string += `0x${hex_code}: ${short_description} - ${parameter_count} Parameter - ${description}\n`;
	}
	return output_string;
}
