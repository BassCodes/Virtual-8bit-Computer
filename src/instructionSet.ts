/**
 * @file CPU instruction definitions & type definitions for parameters and instructions
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { formatHex, inRange, splitNibbles } from "./etc";
import { assertU3, isU3, m256, u8 } from "./num";
import { RuntimeError } from "./errorTypes";
import { GenericComputer } from "./types";

export enum ParamType {
	Constant,
	Variable,
	ConstMemory,
	VarMem,
	VarPair,
}

export abstract class ParameterType {
	readonly desc: string;
	readonly type: ParamType;
	constructor(description: string, p_type: ParamType) {
		this.desc = description;
		this.type = p_type;
	}
	// eslint-disable-next-line class-methods-use-this
	validate(n: u8): boolean {
		return true;
	}
}

/**
 * Instruction Parameter with immediate value
 */
export class ConstParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.Constant);
	}
}

/**
 * Instruction parameter with value in numbered variable
 */
export class VarParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.Variable);
	}
	// eslint-disable-next-line class-methods-use-this
	validate(n: u8): boolean {
		return isU3(n);
	}
}

/**
 *  Instruction parameter with value in numbered memory cell
 */
export class ConstMemoryParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.ConstMemory);
	}
}
/**
 * Instruction parameter with value in memory cell referenced in numbered variable
 */
export class VarMemoryParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.VarMem);
	}
}
type VarPairRole = ParamType.Variable | ParamType.VarMem;
export class VarPairParam extends ParameterType {
	roleA: VarPairRole;
	roleB: VarPairRole;
	descB: string;
	constructor(roleA: VarPairRole, roleB: VarPairRole, descA: string, descB: string) {
		super(descA, ParamType.VarPair);
		this.roleA = roleA;
		this.roleB = roleB;
		this.descB = descB;
	}

	// eslint-disable-next-line class-methods-use-this
	validate(n: u8): boolean {
		const [a, b] = splitNibbles(n);
		return isU3(a) && isU3(b);
	}
}

export interface Instruction {
	readonly name: string;
	readonly desc: string;
	readonly params: Array<ParameterType>;
	readonly execute: (
		computer_reference: GenericComputer,
		parameters: Array<u8>,
		nostep: () => void,
		halt: () => void
	) => void | RuntimeError;
}

export type InstrCategory = {
	start: u8;
	end: u8;
	name: string;
};

export class InstructionSet {
	instructions: Array<Instruction | null>;
	category_ranges: Array<InstrCategory>;
	constructor() {
		this.instructions = Array(256);
		for (let i = 0; i < 256; i++) {
			this.instructions[i] = null;
		}
		this.category_ranges = [];
	}

	insertInstruction(hexCode: u8, instruction: Instruction): void {
		if (this.instructions[hexCode]) {
			throw new Error(`Instruction "${formatHex(hexCode)}" already exists`);
		}
		this.instructions[hexCode] = instruction;
	}

	addCategory(c: InstrCategory): void {
		// Check for overlap with existing ranges
		for (const r of this.category_ranges) {
			if (inRange(c.start, r.start, r.end) || inRange(c.end, r.start, r.end)) {
				throw new Error(`Range of ${c.start}...${c.end} is already registered`);
			}
		}

		this.category_ranges.push(c);
	}

	getInstruction(hexCode: u8): Instruction | null {
		return this.instructions[hexCode];
	}
}

function category(start: u8, end: u8, name: string): InstrCategory {
	return { start, end, name };
}

export const ISA = new InstructionSet();

ISA.addCategory(category(0x10, 0x1f, "Memory & Register Management"));
ISA.addCategory(category(0x20, 0x2f, "Control Flow"));
ISA.addCategory(category(0x30, 0x3f, "Comparison"));
ISA.addCategory(category(0x40, 0x4f, "Logic / Bitwise"));
ISA.addCategory(category(0x50, 0x5f, "Arithmetic"));
ISA.addCategory(category(0xf0, 0xff, "IO"));

// The definitions for actual instructions.

//
//  MEMORY & REGISTER MANAGEMENT
// 0x10 -> 0x1F
//

// COPY
ISA.insertInstruction(0x10, {
	name: "Copy V -> CA",
	desc: "Copy the value in variable (P1) to the memory address (P2)",
	params: [new VarParam("copy the value in this variable"), new ConstMemoryParam("to this memory address")],
	execute(c, p) {
		const [register_no_1, mem_address] = p;
		assertU3(register_no_1);
		c.setMemory(mem_address, c.getRegister(register_no_1));
	},
});

ISA.insertInstruction(0x11, {
	name: "Copy CA -> V",
	desc: "Copy the value in memory address (P1) to the variable (P2)",
	params: [new ConstMemoryParam("copy the value in this memory address"), new VarParam("to this variable")],
	execute(c, p) {
		const [mem_address, register_no_1] = p;
		assertU3(register_no_1);
		c.setRegister(register_no_1, c.getMemory(mem_address));
	},
});

ISA.insertInstruction(0x12, {
	name: "Copy CA -> CA",
	desc: "Copy the value in memory address (P1) to memory address (P2)",
	params: [
		new ConstMemoryParam("copy the value in this memory address"),
		new ConstMemoryParam("to this memory address"),
	],
	execute(c, p) {
		const [mem_address_1, mem_address_2] = p;
		c.setMemory(mem_address_2, c.getMemory(mem_address_1));
	},
});

ISA.insertInstruction(0x13, {
	name: "Copy V -> V",
	desc: "Copy the value in variable (P1) to variable (P2)",
	params: [
		new VarPairParam(ParamType.Variable, ParamType.Variable, "copy the value in this variable", "to this variable"),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		c.setRegister(register_no_2, c.getRegister(register_no_1));
	},
});

ISA.insertInstruction(0x14, {
	name: "Load VA -> V",
	desc: "Copy the value in memory addressed by variable (P1) to variable (P2)",
	params: [
		new VarPairParam(
			ParamType.VarMem,
			ParamType.Variable,
			"copy the value in the memory addressed by this variable",
			"to this variable"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		c.setRegister(register_no_2, c.getMemory(c.getRegister(register_no_1)));
	},
});

ISA.insertInstruction(0x15, {
	name: "Save V -> VA",
	desc: "Copy the value in variable (P1) to the memory cell addressed in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.VarMem,
			"copy the value in this variable",
			"to the memory addressed in this variable"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		c.setMemory(c.getRegister(register_no_2), c.getRegister(register_no_1));
	},
});

ISA.insertInstruction(0x17, {
	name: "Zero Register",
	desc: "Set the value in variable (P1) to 0",
	params: [new VarParam("Set the value in this variable to 0")],
	execute(c, p) {
		const register_no_1 = p[0];
		assertU3(register_no_1);
		c.setRegister(register_no_1, 0);
	},
});

ISA.insertInstruction(0x18, {
	name: "Zero Memory",
	desc: "Set the value in memory address (P1) to 0",
	params: [new VarMemoryParam("Set the value in this memory address to 0")],
	execute(c, p) {
		const mem_address = p[0];
		c.setMemory(mem_address, 0);
	},
});

ISA.insertInstruction(0x19, {
	name: "Set Register",
	desc: "Assigns constant value (P2) to variable (P1)",
	params: [new VarParam("set this variable"), new ConstParam("to this constant")],
	execute(c, p) {
		const [register_no_1, value] = p;
		assertU3(register_no_1);
		c.setRegister(register_no_1, value);
	},
});

ISA.insertInstruction(0x1a, {
	name: "Swap Variables",
	desc: "Swaps the value in variable (P1) with the value in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"swap the value in this variable",
			"with this variable's value"
		),
	],
	execute(c, p) {
		const [v] = p;
		const [register_no_1, register_no_2] = splitNibbles(v);

		assertU3(register_no_1);
		assertU3(register_no_2);

		const r1_val = c.getRegister(register_no_1);
		const r2_val = c.getRegister(register_no_2);

		c.setRegister(register_no_1, r2_val);
		c.setRegister(register_no_2, r1_val);
	},
});

//
// CONTROL FLOW
// 0x20 -> 0x2F
//

ISA.insertInstruction(0x20, {
	name: "Goto",
	desc: "Look for next instruction at memory position (P1)",
	params: [new VarMemoryParam("look for next instruction at the memory addressed in this variable")],
	execute: (c, p, nostep) => {
		const register_no_1 = p[0];
		assertU3(register_no_1);

		const new_address = c.getRegister(register_no_1);
		c.setProgramCounter(new_address);
		nostep();
	},
});

ISA.insertInstruction(0x21, {
	name: "Goto",
	desc: "Look for next instruction at memory position (P1)",
	params: [new ConstMemoryParam("look for next instruction at the memory address in this constant")],
	execute: (c, p, nostep) => {
		const new_address = p[0];
		c.setProgramCounter(new_address);
		nostep();
	},
});

ISA.insertInstruction(0x22, {
	name: "Goto if Not equal to zero",
	desc: "Look for next instruction at memory address within variable (P2) if the value in variable (P1) ≠ 0",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.VarMem,
			"if the value in this variable is not zero",
			"then look for next instruction at the address in this variable"
		),
	],
	execute: (c, p, nostep) => {
		const [v] = p;
		const [register_no_1, register_no_2] = splitNibbles(v);
		assertU3(register_no_1);
		assertU3(register_no_2);
		const bool = c.getRegister(register_no_1);
		if (bool === 0) return;
		const new_address = c.getRegister(register_no_2);
		c.setProgramCounter(new_address);
		nostep();
	},
});

ISA.insertInstruction(0x23, {
	name: "Goto if Not equal to zero",
	desc: "Look for next instruction at memory address in constant (P2) if the value in variable (P1) ≠ 0",
	params: [
		new VarParam("if the value in this variable is not zero"),
		new ConstMemoryParam("then look for next instruction at address in this constant"),
	],
	execute: (c, p, nostep) => {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const bool = c.getRegister(register_no_1);
		if (bool === 0) return;
		c.setProgramCounter(constant_value);
		nostep();
	},
});

ISA.insertInstruction(0x28, {
	name: "Goto if Carry Flag set",
	desc: "Look for next instruction at memory address in variable (P1) if CPU Carry flag is true",
	params: [new VarMemoryParam("look for next instruction at address in this variable")],
	execute: (c, p, nostep) => {
		if (!c.getCarry()) return;
		const register_no_1 = p[0];
		assertU3(register_no_1);
		const register_value = c.getRegister(register_no_1);
		c.setProgramCounter(register_value);
		nostep();
		c.setCarry(false);
	},
});

ISA.insertInstruction(0x29, {
	name: "Goto if Carry Flag set",
	desc: "Look for next instruction at memory position within constant (P1) if CPU Carry flag is true",
	params: [new ConstParam("look for next instruction at address in this constant")],
	execute: (c, p, nostep) => {
		if (!c.getCarry()) return;
		const goto_address = p[0];
		c.setProgramCounter(goto_address);
		nostep();
		c.setCarry(false);
	},
});

ISA.insertInstruction(0x2e, {
	name: "Nothing",
	desc: "Do nothing",
	params: [],
	execute: () => {},
});

ISA.insertInstruction(0x2f, {
	name: "Halt",
	desc: "Stops CPU execution and resets",
	params: [],
	execute(c, p, n, halt) {
		halt();
	},
});

//
// Comparison
// 0x30 -> 0x3F
//

ISA.insertInstruction(0x30, {
	name: "Equals",
	desc: "If value in variable (P2) equals value in variable (P3), set value in variable (P1) to true",
	params: [
		new VarParam("Set this variable to 1"),
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"if this variable's value equals",
			"this variable's value (else 0)"
		),
	],
	execute(c, p) {
		const [register_no_1, nibbles] = p;
		const [register_no_2, register_no_3] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		assertU3(register_no_3);
		const truth = c.getRegister(register_no_2) === c.getRegister(register_no_3) ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});

ISA.insertInstruction(0x31, {
	name: "Equals",
	desc: "If value in variable (P2) equals constant value (P3), set value in variable (P1) to true",
	params: [
		new VarParam("Set this variable to 1"),
		new VarParam("if this variable and"),
		new ConstParam("this constant are equal (else 0)"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, constant_value] = p;
		assertU3(register_no_1);
		assertU3(register_no_2);
		const truth = c.getRegister(register_no_2) === constant_value ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});

ISA.insertInstruction(0x32, {
	name: "Less Than",
	desc: "Sets variable (P1) to 1 if value in variable (P2) is less than the value in variable (P3)",
	params: [
		new VarParam("set this variable to 1"),
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"if this variable's value is less than",
			"this variable's value (else 0)"
		),
	],
	execute(c, p) {
		const [register_no_1, nibbles] = p;
		const [register_no_2, register_no_3] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		assertU3(register_no_3);
		const truth = c.getRegister(register_no_2) < c.getRegister(register_no_3) ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});

ISA.insertInstruction(0x33, {
	name: "Less Than",
	desc: "Sets variable (P1) to 1 if value in variable (P2) is less than the constant value (P3)",
	params: [
		new VarParam("Set this variable to 1"),
		new VarParam("if this variable's value is less than"),
		new ConstParam("this constant (else 0)"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, constant_value] = p;
		assertU3(register_no_1);
		assertU3(register_no_2);
		const truth = c.getRegister(register_no_2) < constant_value ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});

ISA.insertInstruction(0x34, {
	name: "Greater Than",
	desc: "Sets variable (P1) to 1 if value in variable (P2) is greater than the value in variable (P3)",
	params: [
		new VarParam("Set this variable to true"),
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"if this variable's value greater than",
			"this variable's value (else 0)"
		),
	],
	execute(c, p) {
		const [register_no_1, nibbles] = p;
		const [register_no_2, register_no_3] = splitNibbles(nibbles);

		assertU3(register_no_1);
		assertU3(register_no_2);
		assertU3(register_no_3);
		const truth = c.getRegister(register_no_2) > c.getRegister(register_no_3) ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});

ISA.insertInstruction(0x35, {
	name: "Greater than",
	desc: "Sets variable (P1) to 1 if value in variable (P2) is greater than the constant value (P3)",
	params: [
		new VarParam("Set this variable to true"),
		new VarParam("if this variable's value is greater than"),
		new ConstParam("this constant (else 0)"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, constant_value] = p;
		assertU3(register_no_1);
		assertU3(register_no_2);
		const truth = c.getRegister(register_no_2) > constant_value ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});

//
// Logic / Bitwise
// 0x40 -> 0x4F
//

ISA.insertInstruction(0x40, {
	name: "Bitwise OR",
	desc: "Sets each bit in variable (P1) to its OR with the respective bit in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"OR each bit in this variable's value",
			"with each bit in this variable's value"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		const new_value = c.getRegister(register_no_1) | c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x41, {
	name: "Bitwise OR",
	desc: "Sets each bit in variable (P1) to its OR with the respective bit in constant value (P2)",
	params: [new VarParam("OR each bit in this variable's value"), new ConstParam("with each bit in this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const new_value = c.getRegister(register_no_1) | constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x42, {
	name: "Bitwise AND",
	desc: "Sets each bit in variable (P1) to its AND with the respective bit in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"AND each bit in this variable's value",
			"with each bit in this variable's value"
		),
	],
	execute(c, p) {
		const [nibbles] = p;

		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		const new_value = c.getRegister(register_no_1) & c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x43, {
	name: "Bitwise AND",
	desc: "Sets each bit in variable (P1) to its AND with the respective bit in constant value (P2)",
	params: [new VarParam("AND each bit in this variable's value"), new ConstParam("with each bit in this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const new_value = c.getRegister(register_no_1) & constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x44, {
	name: "Bitwise XOR",
	desc: "Sets each bit in variable (P1) to its XOR with the respective bit in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"XOR each bit in this variable's value",
			"with each bit in this variable's value"
		),
	],
	execute(c, p) {
		const [nibbles] = p;

		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		const new_value = c.getRegister(register_no_1) ^ c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x45, {
	name: "Bitwise XOR",
	desc: "Sets each bit in variable (P1) to its XOR with the respective bit in constant value (P2)",
	params: [new VarParam("XOR each bit in this variable's value"), new ConstParam("with each bit in this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const new_value = c.getRegister(register_no_1) ^ constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x46, {
	name: "Left Bit Shift",
	desc: "Shifts each bit in variable (P1) to the left by the amount in variable (P2). Fills new bits with 0",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"shift each bit in this variable left",
			"by the amount in this variable"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		const new_value = (c.getRegister(register_no_1) << c.getRegister(register_no_2)) & 0xff;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x47, {
	name: "Left Bit Shift",
	desc: "Shifts each bit in variable (P1) to the left by the constant value (P2). Fills new bits with 0",
	params: [new VarParam("shift each bit in this variable left"), new ConstParam("by the amount in this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const new_value = (c.getRegister(register_no_1) << constant_value) & 0xff;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x48, {
	name: "Right Bit Shift",
	desc: "Shifts each bit in variable (P1) to the right by the amount in variable (P2). Fills new bits with 0",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"shift each bit in this variable right",
			"by the amount in this variable"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		const new_value = c.getRegister(register_no_1) >> c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x49, {
	name: "Right Bit Shift",
	desc: "Shifts each bit in variable (P1) to the right by the constant value (P2). Fills new bits with 0",
	params: [new VarParam("shift each bit in this variable right"), new ConstParam("by the amount in this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const new_value = c.getRegister(register_no_1) >> constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x4a, {
	name: "Bitwise NOT",
	desc: "Flips each bit in variable (P1)",
	params: [new VarParam("invert each bit in this variable")],
	execute(c, p) {
		const register_no_1 = p[0];
		assertU3(register_no_1);
		const new_value = ~c.getRegister(register_no_1) & 0xff;
		c.setRegister(register_no_1, new_value as u8);
	},
});

//
// Arithmetic
// 0x50 -> 0x5F
//

ISA.insertInstruction(0x50, {
	name: "Add",
	desc: "Adds to the value in variable (P1) with the value in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"set this variable to",
			"its sum with this variable's value"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		assertU3(register_no_1);
		assertU3(register_no_2);
		const sum = c.getRegister(register_no_1) + c.getRegister(register_no_2);
		if (sum > 255) {
			c.setCarry(true);
		}
		c.setRegister(register_no_1, m256(sum));
	},
});

ISA.insertInstruction(0x51, {
	name: "Add",
	desc: "Adds to the value in variable (P1) with the value in variable (P2)",
	params: [new VarParam("set this variable to"), new ConstParam("its sum with this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const sum = c.getRegister(register_no_1) + constant_value;
		if (sum > 255) c.setCarry(true);
		c.setRegister(register_no_1, m256(sum));
	},
});

ISA.insertInstruction(0x52, {
	name: "Subtract",
	desc: "Subtracts from the value in variable (P1) by the value in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"set this variable to",
			"its difference with this variable's value"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);

		assertU3(register_no_1);
		assertU3(register_no_2);
		const difference = c.getRegister(register_no_1) - c.getRegister(register_no_2);
		if (difference < 0) {
			c.setCarry(true);
		}
		c.setRegister(register_no_1, m256(difference));
	},
});

ISA.insertInstruction(0x53, {
	name: "Subtract",
	desc: "Subtracts from the value in variable (P1) by the constant value (P2)",
	params: [new VarParam("set this variable to"), new ConstParam("its difference with this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const difference = c.getRegister(register_no_1) - constant_value;
		if (difference < 0) c.setCarry(true);
		c.setRegister(register_no_1, m256(difference));
	},
});

ISA.insertInstruction(0x54, {
	name: "Multiply",
	desc: "Multiplies the value in variable (P1) by value in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"set this variable to",
			"its product with this variable's value"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);

		assertU3(register_no_1);
		assertU3(register_no_2);
		const product = c.getRegister(register_no_1) * c.getRegister(register_no_2);
		c.setRegister(register_no_1, m256(product));
	},
});

ISA.insertInstruction(0x55, {
	name: "Multiply",
	desc: "Multiplies the value in variable (P1) by constant value (P2)",
	params: [new VarParam("set this variable to"), new ConstParam("its product with this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const product = c.getRegister(register_no_1) * constant_value;
		c.setRegister(register_no_1, m256(product));
	},
});

ISA.insertInstruction(0x56, {
	name: "Divide",
	desc: "Divides the value in variable (P1) by value in variable (P2)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"divide this variable by",
			"the value in this variable's value"
		),
	],
	execute(c, p) {
		const [t] = p;
		const [numerator_reg, denominator_reg] = splitNibbles(t);
		assertU3(numerator_reg);
		assertU3(denominator_reg);

		const denominator = c.getRegister(denominator_reg);
		const numerator = c.getRegister(numerator_reg);

		if (denominator === 0) {
			return { err: "divide_zero", variable: denominator_reg };
		}
		const quotient = Math.floor(numerator / denominator);
		c.setRegister(numerator_reg, m256(quotient));
	},
});

ISA.insertInstruction(0x57, {
	name: "Divide",
	desc: "Divides the value in variable (P1) by constant value (P2)",
	params: [new VarParam("divide this variable by"), new ConstParam("the value in this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const numerator = c.getRegister(register_no_1);
		if (constant_value === 0) {
			return { err: "divide_zero" };
		}
		const quotient = Math.floor(numerator / constant_value);
		c.setRegister(register_no_1, m256(quotient));
	},
});
ISA.insertInstruction(0x58, {
	name: "Modulus",
	desc: "Divides the value in variable (P1) by value in variable (P2) stores remainder in (P1)",
	params: [
		new VarPairParam(
			ParamType.Variable,
			ParamType.Variable,
			"set this variable to the remainder",
			"of the division by this variable's value"
		),
	],
	execute(c, p) {
		const [t] = p;
		const [numerator_reg, denominator_reg] = splitNibbles(t);
		assertU3(numerator_reg);
		assertU3(denominator_reg);

		const denominator = c.getRegister(denominator_reg);
		const numerator = c.getRegister(numerator_reg);

		if (denominator === 0) {
			return { err: "divide_zero", variable: denominator_reg };
		}
		const remainder = Math.floor(numerator % denominator);
		c.setRegister(numerator_reg, m256(remainder));
	},
});

ISA.insertInstruction(0x59, {
	name: "Modulus",
	desc: "Divides the value in variable (P1) by constant value (P2) stores remainder in (P1)",
	params: [new VarParam("set this variable to the remainder"), new ConstParam("of the division by this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		assertU3(register_no_1);
		const numerator = c.getRegister(register_no_1);
		if (constant_value === 0) {
			return { err: "divide_zero" };
		}
		const rem = numerator % constant_value;
		c.setRegister(register_no_1, rem as u8);
	},
});

ISA.insertInstruction(0x5e, {
	name: "Increment",
	desc: "Increments the value within variable (P1) by 1",
	params: [new VarParam("this variable")],
	execute(c, p) {
		const register_no_1 = p[0];
		assertU3(register_no_1);
		const current_value = c.getRegister(register_no_1);
		const incremented = current_value + 1;
		if (incremented > 255) c.setCarry(true);
		c.setRegister(register_no_1, m256(incremented));
	},
});

ISA.insertInstruction(0x5f, {
	name: "Decrement",
	desc: "Decrements the value within variable (P1) by 1",
	params: [new VarParam("this variable")],
	execute(c, p) {
		const register_no_1 = p[0];
		assertU3(register_no_1);
		const current_value = c.getRegister(register_no_1);
		const decremented = current_value - 1;
		if (decremented < 0) c.setCarry(true);
		c.setRegister(register_no_1, m256(decremented) as u8);
	},
});

// IO

ISA.insertInstruction(0xf0, {
	name: "Random Number",
	desc: "Sets variable (R1) to a random value",
	params: [new VarParam("randomize this variable")],
	execute(c, p) {
		const [register_no_1] = p;
		assertU3(register_no_1);
		// Math.random returns a value  n: 0 =< n < 1, thus
		// floor(n * 256): 0 =< floor(n * 256) < 256
		// Mod256 it just for type safety
		const value = m256(Math.floor(Math.random() * 256));
		c.setRegister(register_no_1, value);
	},
});

// Screen

ISA.insertInstruction(0xff, {
	name: "Set Pixel",
	desc: "Sets the color constant (P2) for pixel at position in variable (P1)",
	params: [new VarParam("at the position in this variable"), new ConstParam("to this color")],
	execute(c, p) {
		const [register_no_1, pixel_val] = p;
		assertU3(register_no_1);
		const pixel_no = c.getRegister(register_no_1);
		c.setVram(pixel_no, pixel_val);
	},
});

ISA.insertInstruction(0xfe, {
	name: "Set Pixel",
	desc: "Sets the color value in variable (P2) for pixel at position in variable (P1)",
	params: [
		new VarPairParam(
			ParamType.VarMem,
			ParamType.Variable,
			"at the position in the variable",
			"to the color in this variable"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);

		assertU3(register_no_1);
		assertU3(register_no_2);
		const pixel_no = c.getRegister(register_no_1);
		const pixel_val = c.getRegister(register_no_2);
		c.setVram(pixel_no, pixel_val);
	},
});

ISA.insertInstruction(0xfd, {
	name: "Get Pixel",
	desc: "Stores the color value for pixel addressed in (R1) to variable (R2)",
	params: [
		new VarPairParam(
			ParamType.VarMem,
			ParamType.Variable,
			"get the value of pixel addressed in this variable",
			"and store it to this variable"
		),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);

		assertU3(register_no_1);
		assertU3(register_no_2);
		const pixel_no = c.getRegister(register_no_1);
		const value = c.getVram(pixel_no);
		c.setRegister(register_no_2, value);
	},
});

ISA.insertInstruction(0xfa, {
	name: "Set Palette",
	desc: "Changes the color palette. The TV uses the color palette to interpret pixel values",
	params: [new ConstParam("to this constant palette number")],
	execute(c, p) {
		const [pal] = p;
		c.setColorPalette(pal);
	},
});

ISA.insertInstruction(0xf1, {
	name: "Clear Screen",
	desc: "Sets all pixels on screen to zero.",
	params: [],
	execute(c) {
		for (let i = 0; i < 256; i++) {
			c.setVram(i as u8, 0);
		}
	},
});
