import { format_hex, u8 } from "./etc";
import { Instruction, InstructionSet } from "./instructionSet";

export function generate_isa(iset: InstructionSet): string {
	const instructions: Array<[u8, Instruction]> = [];
	for (const kv of iset.instructions.entries()) {
		instructions.push(kv);
	}
	let output_string = "INSTRUCTIONS\n";
	let max_instr_name_len = 0;
	for (const instruction of instructions) {
		const short_description = instruction[1].name;
		max_instr_name_len = Math.max(max_instr_name_len, short_description.length);
	}
	for (const instruction of instructions) {
		const hex_code = format_hex(instruction[0]);
		const short_description = instruction[1].name.padEnd(max_instr_name_len, " ");
		const parameter_count = instruction[1].params.length;
		const description = instruction[1].desc;
		output_string += `0x${hex_code}: ${short_description} - ${parameter_count} Parameter - ${description}\n`;
	}
	return output_string;
}
