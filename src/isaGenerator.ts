/**
 * @file Automatic generation of instruction set description
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { format_hex, in_range } from "./etc";
import { InstrCategory, Instruction, InstructionSet, ParameterType, ParamType } from "./instructionSet";
import { u8 } from "./num";

export function generate_isa(iset: InstructionSet): string {
	const instructions: Array<[u8, Instruction]> = [];

	for (const kv of iset.instructions.entries()) instructions.push(kv);

	let output_string = "INSTRUCTIONS\n";

	const max_instr_name_len = instructions.map((i) => i[1].name.length).reduce((acc, p) => Math.max(p, acc), 0);
	instructions.sort((a, b) => a[0] - b[0]);

	let current_category: InstrCategory | null = null;

	for (const instruction of instructions) {
		const cat = iset.category_ranges.find((i) => in_range(instruction[0], i.start, i.end));
		if (cat === undefined) {
			throw new Error("Instruction found which is not part of category");
		}
		if (current_category !== cat) {
			output_string += `-- ${cat.name.toUpperCase()} --\n`;
			current_category = cat;
		}
		const hex_code = format_hex(instruction[0]);

		const short_description = instruction[1].name.padEnd(max_instr_name_len, " ");
		const parameters = parameter_description(instruction[1].params);
		const description = instruction[1].desc;
		output_string += `0x${hex_code}: ${short_description}`;
		if (parameters.length !== 0) {
			output_string += ` -${parameters}- `;
		} else {
			output_string += " - ";
		}
		output_string += `${description}\n`;
	}
	return output_string;
}

function parameter_description(params: Array<ParameterType>): string {
	let str = "";
	if (params.length !== 0) {
		str += " ";
	}
	for (const p of params) {
		const p_map = { [ParamType.Const]: "C", [ParamType.Memory]: "M", [ParamType.Register]: "R" };
		const char = p_map[p.type];
		str += char;
		str += " ";
	}
	return str;
}
