/**
 * @file Automatic generation of instruction set description
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el, formatHex, inRange } from "./etc";
import { InstrCategory, Instruction, InstructionSet, VarPairParam, ParameterType, ParamType } from "./instructionSet";
import { u8 } from "./num";

function parameterDescription(params: Array<ParameterType>): string {
	let str = "";
	if (params.length !== 0) {
		str += " ";
	}
	for (const p of params) {
		const p_map = {
			[ParamType.Constant]: "C",
			[ParamType.ConstMemory]: "CA",
			[ParamType.Variable]: "V",
			[ParamType.VarMem]: "VA",
			[ParamType.VarPair]: "",
		};
		let paramStr = "";
		if (p.type === ParamType.VarPair) {
			const p1_str = p_map[(p as VarPairParam).roleA];
			const p2_str = p_map[(p as VarPairParam).roleB];
			paramStr = `Pair(${p1_str},&nbsp;${p2_str})`;
		} else {
			paramStr = p_map[p.type];
		}
		str += paramStr;
		str += " ";
	}
	return str;
}

export function generateIsaTable(iset: InstructionSet): HTMLTableElement {
	const table = el("table");

	// Headers
	el("tr")
		.ch(el("td").tx("Code"))
		.ch(el("td").tx("Parameter"))
		// .ch(el("td").tx("pneumonic"))
		.ch(el("td").tx("Action"))
		.ch(el("td").tx("Description"))
		.appendTo(table);

	const instructions: Array<[u8, Instruction]> = [];
	for (const [opcode, instr] of iset.instructions.entries()) instr === null || instructions.push([opcode as u8, instr]);

	let current_category: InstrCategory | null = null;
	for (const [code, instr] of instructions) {
		if (instr.hidden === true) {
			continue;
		}
		const cat = iset.category_ranges.find((i) => inRange(code, i.start, i.end));
		if (cat === undefined) {
			throw new Error(`Instruction found which is not part of category ${code}`);
		}
		if (current_category !== cat) {
			// prettier-ignore
			el("tr")
				.ch(el("td")
					.tx(cat.name.toUpperCase())
					.at("colspan", "4").cl("category"))
				.appendTo(table);
			current_category = cat;
		}

		el("tr")
			.ch(el("td").tx(formatHex(code)))
			.ch(el("td").ht(parameterDescription(instr.params)))
			// .ch(el("td").tx(instr.pneumonic))
			.ch(el("td").tx(instr.name))
			.ch(el("td").tx(instr.desc))
			.appendTo(table);
	}

	return table.fin();
}
