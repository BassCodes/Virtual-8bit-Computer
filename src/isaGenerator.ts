/**
 * @file Automatic generation of instruction set description
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { el, formatHex, inRange } from "./etc";
import { InstrCategory, Instruction, InstructionSet, ParameterType, ParamType } from "./instructionSet";
import { u8 } from "./num";

function parameterDescription(params: Array<ParameterType>): string {
	let str = "";
	if (params.length !== 0) {
		str += " ";
	}
	for (const p of params) {
		const p_map = {
			[ParamType.Const]: "C",
			[ParamType.ConstMemory]: "CM",
			[ParamType.Register]: "R",
			[ParamType.Bank]: "B",
			[ParamType.RegisterAddress]: "RA",
		};
		const char = p_map[p.type];
		str += char;
		str += " ";
	}
	return str;
}

export function generateIsaTable(iset: InstructionSet): HTMLTableElement {
	const table = el("table").fin();

	const headings = el("tr").fin();

	headings.appendChild(el("td").tx("Code").fin());
	headings.appendChild(el("td").tx("Parameters").fin());
	headings.appendChild(el("td").tx("Name").fin());
	headings.appendChild(el("td").tx("Description").fin());
	table.appendChild(headings);

	const instructions: Array<[u8, Instruction]> = [];

	for (const kv of iset.instructions.entries()) instructions.push(kv);

	let current_category: InstrCategory | null = null;
	for (const [code, instr] of instructions) {
		const cat = iset.category_ranges.find((i) => inRange(code, i.start, i.end));
		if (cat === undefined) {
			throw new Error("Instruction found which is not part of category");
		}
		if (current_category !== cat) {
			const category_row = el("tr").fin();
			category_row.appendChild(el("td").tx(cat.name.toUpperCase()).at("colspan", "4").cl("category").fin());
			table.appendChild(category_row);
			current_category = cat;
		}
		const row = el("tr").fin();
		const instr_text = instr.name;

		row.appendChild(
			el("td")
				.tx(`0x${formatHex(code)}`)
				.fin()
		);
		row.appendChild(el("td").tx(parameterDescription(instr.params)).fin());
		row.appendChild(el("td").tx(instr_text).fin());
		row.appendChild(el("td").tx(instr.desc).fin());
		table.appendChild(row);
	}

	return table;
}
