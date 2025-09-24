/**
 * @file CPU instruction definitions & type definitions for parameters and instructions
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { formatHex, inRange, splitNibbles } from "./etc";
import { isU3, isU8, m256, u3, u8 } from "./num";
import { RuntimeError } from "./errorTypes";
import { GenericComputer } from "./types";

export enum ParamType {
	Const,
	Register,
	ConstMemory,
	RegisterAddress,
	NibbleRegisterPair,
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
		super(d, ParamType.Const);
	}
}

/**
 * Instruction parameter with value in numbered register
 */
export class RegisParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.Register);
	}
	// eslint-disable-next-line class-methods-use-this
	validate(n: u8): boolean {
		return isU3(n);
	}
}

/**
 *  Instruction parameter with value in numbered memory cell
 */
export class ConstMemorParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.ConstMemory);
	}
}
/**
 * Instruction parameter with value in memory cell referenced in numbered register
 */
export class RegisAddrParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.RegisterAddress);
	}
}
type NibbleRegisterRole = "R" | "RM";
export class NibbleRegisPairParam extends ParameterType {
	roleA: NibbleRegisterRole;
	roleB: NibbleRegisterRole;
	constructor(d: string, roleA: NibbleRegisterRole, roleB: NibbleRegisterRole) {
		super(d, ParamType.NibbleRegisterPair);
		this.roleA = roleA;
		this.roleB = roleB;
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
		nostep: () => void
	) => void | RuntimeError;
}

export type InstrCategory = {
	start: u8;
	end: u8;
	name: string;
};

export class InstructionSet {
	instructions: Map<u8, Instruction>;
	category_ranges: Array<InstrCategory>;
	constructor() {
		this.instructions = new Map();
		this.category_ranges = [];
	}

	insertInstruction(hexCode: u8, instruction: Instruction): void {
		if (this.instructions.has(hexCode)) {
			throw new Error(`Instruction "${formatHex(hexCode)}" already exists`);
		}
		this.instructions.set(hexCode, instruction);
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
		return this.instructions.get(hexCode) ?? null;
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
	name: "Copy CR -> CM",
	desc: "Copy the byte in register (P1) to the memory address (P2)",
	params: [new RegisParam("Write the byte in this register"), new ConstMemorParam("To this memory address")],
	execute(c, p) {
		const [register_no_1, mem_address] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		c.setMemory(mem_address, c.getRegister(register_no_1));
	},
});

ISA.insertInstruction(0x11, {
	name: "Copy CM -> R",
	desc: "Copy the byte in memory address (P1) to the register (P2)",
	params: [new ConstMemorParam(""), new RegisParam("")],
	execute(c, p) {
		const [mem_address, register_no_1] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		c.setRegister(register_no_1, c.getMemory(mem_address));
	},
});

ISA.insertInstruction(0x12, {
	name: "Copy CM -> CM",
	desc: "Copy the byte in memory address (P1) to memory address (P2)",
	params: [new ConstMemorParam("Copy the byte in this memory address"), new ConstMemorParam("To this memory address")],
	execute(c, p) {
		const [mem_address_1, mem_address_2] = p;
		c.setMemory(mem_address_2, c.getMemory(mem_address_1));
	},
});

ISA.insertInstruction(0x13, {
	name: "Copy R -> R",
	desc: "Copy the byte in register (P1) to register (P2)",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		c.setRegister(register_no_2, c.getRegister(register_no_1));
	},
});
ISA.insertInstruction(0x14, {
	name: "Load RA -> R",
	desc: "Copy the byte in memory addressed by register (P1) to register (P2)",
	params: [new NibbleRegisPairParam("", "RM", "R")],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		c.setRegister(register_no_2, c.getMemory(c.getRegister(register_no_1)));
	},
});
ISA.insertInstruction(0x15, {
	name: "Save R -> RA",
	desc: "Copy the byte in register (P1) to the memory cell addressed in register (P2)",
	params: [
		// new RegisParam("Copy the value in this register"),
		// new RegisAddrParam("To the memory cell addressed in this register"),
		new NibbleRegisPairParam("", "R", "RM"),
	],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		c.setMemory(c.getRegister(register_no_2), c.getRegister(register_no_1));
	},
});

ISA.insertInstruction(0x17, {
	name: "Zero Register",
	desc: "Set the byte in register (P1) to 0",
	params: [new RegisParam("Set the value in this register to 0")],
	execute(c, p) {
		const register_no_1 = p[0];
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		c.setRegister(register_no_1, 0);
	},
});
ISA.insertInstruction(0x18, {
	name: "Zero Memory",
	desc: "Set the byte in memory address (P1) to 0",
	params: [new RegisAddrParam("Set the value in this memory address to 0")],
	execute(c, p) {
		const mem_address = p[0];
		c.setMemory(mem_address, 0);
	},
});

ISA.insertInstruction(0x19, {
	name: "Set Register",
	desc: "Assigns constant value (P2) to register (P1)",
	params: [new RegisParam("Set this register"), new ConstParam("to this constant")],
	execute(c, p) {
		const [register_no_1, value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		c.setRegister(register_no_1, value);
	},
});

//
// CONTROL FLOW
// 0x20 -> 0x2F
//

ISA.insertInstruction(0x20, {
	name: "Goto",
	desc: "Moves the CPU instruction counter to the value in register (P1)",
	params: [new RegisParam("new instruction counter location")],
	execute: (c, p, nostep) => {
		const register_no_1 = p[0];
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };

		const new_address = c.getRegister(register_no_1);
		c.setProgramCounter(new_address);
		nostep();
	},
});

ISA.insertInstruction(0x21, {
	name: "Goto",
	desc: "Moves the CPU instruction counter to the value in (P1)",
	params: [new ConstParam("new instruction counter location")],
	execute: (c, p, nostep) => {
		const new_address = p[0];
		c.setProgramCounter(new_address);
		nostep();
	},
});

ISA.insertInstruction(0x26, {
	name: "Goto Relative",
	desc: "Increments the instruction counter by (P1)",
	params: [new ConstParam("counter location offset")],
	execute: (c, p, nostep) => {
		const new_address = m256(c.getProgramCounter() + p[0]);

		c.setProgramCounter(new_address);
		nostep();
	},
});

ISA.insertInstruction(0x22, {
	name: "Goto if True",
	desc: "Moves the instruction counter to the value in register (P2) if the value in register (P1) is true",
	params: [new RegisParam(""), new RegisParam("")],
	execute: (c, p, nostep) => {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const bool = c.getRegister(register_no_1);
		if (!bool) return;
		const new_address = c.getRegister(register_no_2);
		c.setProgramCounter(new_address);
		nostep();
	},
});

ISA.insertInstruction(0x23, {
	name: "Goto if True",
	desc: "Moves the instruction counter to the value in (P2) if the value in register (P1) is true",
	params: [new RegisParam(""), new ConstParam("")],
	execute: (c, p, nostep) => {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const bool = c.getRegister(register_no_1);
		if (!bool) return;
		c.setProgramCounter(constant_value);
		nostep();
	},
});

ISA.insertInstruction(0x25, {
	name: "Goto and save position",
	desc: "Moves the instruction counter to the value in (P2) and stores the address of the following instruction to R!",
	params: [new RegisAddrParam(""), new ConstParam("")],
	execute: (c, p, nostep) => {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const bool = c.getRegister(register_no_1);
		const next_instruction = m256(c.getProgramCounter() + 1);
		c.setRegister(register_no_1, next_instruction);

		c.setProgramCounter(constant_value);
		nostep();
	},
});

ISA.insertInstruction(0x28, {
	name: "Goto if Carry Flag set",
	desc: "Moves the instruction counter to the value in register (P1) if CPU Carry flag is true",
	params: [new RegisParam("")],
	execute: (c, p, nostep) => {
		if (!c.getCarry()) return;
		const register_no = p[0];
		if (!isU3(register_no)) return { err: "invalid_register", no: register_no };
		const register_value = c.getRegister(register_no);
		c.setProgramCounter(register_value);
		nostep();
		c.setCarry(false);
	},
});
ISA.insertInstruction(0x29, {
	name: "Goto if Carry Flag set",
	desc: "Moves the instruction counter to the value in (P1) if CPU Carry flag is true",
	params: [new ConstParam("")],
	execute: (c, p, nostep) => {
		if (!c.getCarry()) return;
		const goto_address = p[0];
		c.setProgramCounter(goto_address);
		nostep();
		c.setCarry(false);
	},
});

ISA.insertInstruction(0x2e, {
	name: "NoOp",
	desc: "No operation; do nothing",
	params: [],
	execute: () => {},
});

ISA.insertInstruction(0x2f, {
	name: "Halt",
	desc: "Stops CPU execution and soft resets",
	params: [],
	execute(c) {
		c.softReset();
	},
});

//
// Comparison
// 0x30 -> 0x3F
//

ISA.insertInstruction(0x30, {
	name: "Equals",
	desc: "If byte in register (P2) equals byte in register (P3), set byte in register (P1) to true",
	params: [
		new RegisParam("Set this register to true"),
		new NibbleRegisPairParam("compare these two registers", "R", "R"),
	],
	execute(c, p) {
		const [register_no_1, nibbles] = p;
		const [register_no_2, register_no_3] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		if (!isU3(register_no_3)) return { err: "invalid_register", no: register_no_3 };
		const truth = c.getRegister(register_no_2) === c.getRegister(register_no_3) ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});
ISA.insertInstruction(0x31, {
	name: "Equals",
	desc: "If byte in register (P2) equals constant byte (P3), set byte in register (P1) to true",
	params: [
		new RegisParam("Set this register to true"),
		new RegisParam("if this register and"),
		new ConstParam("this constant are equal (else false)"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const truth = c.getRegister(register_no_2) === constant_value ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});
ISA.insertInstruction(0x32, {
	name: "Less Than",
	desc: "Sets register (P1) to true if value in register (P2) is less than the value in register (P3)",
	params: [
		new RegisParam("Set this register to true"),
		new NibbleRegisPairParam("Compare these two registers", "R", "R"),
	],
	execute(c, p) {
		const [register_no_1, nibbles] = p;
		const [register_no_2, register_no_3] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		if (!isU3(register_no_3)) return { err: "invalid_register", no: register_no_3 };
		const truth = c.getRegister(register_no_2) < c.getRegister(register_no_3) ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});
ISA.insertInstruction(0x33, {
	name: "Less Than",
	desc: "Sets register (P1) to true if value in register (P2) is less than the constant value (P3)",
	params: [
		new RegisParam("Set this register to true"),
		new RegisParam("if this register is less than"),
		new ConstParam("this constant"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const truth = c.getRegister(register_no_2) < constant_value ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});
ISA.insertInstruction(0x34, {
	name: "Greater Than",
	desc: "Sets register (P1) to true if value in register (P2) is greater than the value in register (P3)",
	params: [
		new RegisParam("Set this register to true"),
		new NibbleRegisPairParam("Compare these two registers", "R", "R"),
	],
	execute(c, p) {
		const [register_no_1, nibbles] = p;
		const [register_no_2, register_no_3] = splitNibbles(nibbles);

		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		if (!isU3(register_no_3)) return { err: "invalid_register", no: register_no_3 };
		const truth = c.getRegister(register_no_2) > c.getRegister(register_no_3) ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});
ISA.insertInstruction(0x35, {
	name: "Greater than",
	desc: "Sets register (P1) to true if value in register (P2) is greater than the constant value (P3)",
	params: [
		new RegisParam("Set this register to true"),
		new RegisParam("if this register is greater than"),
		new ConstParam("this constant"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
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
	desc: "Sets each bit in register (P1) to its OR with the respective bit in register (P2)",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const new_value = c.getRegister(register_no_1) | c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x41, {
	name: "Bitwise OR",
	desc: "Sets each bit in register (P1) to its OR with the respective bit in constant value (P2)",
	params: [new RegisParam(""), new ConstParam("")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const new_value = c.getRegister(register_no_1) | constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x42, {
	name: "Bitwise AND",
	desc: "Sets each bit in register (P1) to its AND with the respective bit in register (P2)",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;

		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const new_value = c.getRegister(register_no_1) & c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x43, {
	name: "Bitwise AND",
	desc: "Sets each bit in register (P1) to its AND with the respective bit in constant value (P2)",
	params: [new RegisParam(""), new ConstParam("")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const new_value = c.getRegister(register_no_1) & constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x44, {
	name: "Bitwise XOR",
	desc: "Sets each bit in register (P1) to its XOR with the respective bit in register (P2)",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;

		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const new_value = c.getRegister(register_no_1) ^ c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x45, {
	name: "Bitwise XOR",
	desc: "Sets each bit in register (P1) to its XOR with the respective bit in constant value (P2)",
	params: [new RegisParam(""), new ConstParam("")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const new_value = c.getRegister(register_no_1) ^ constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x46, {
	name: "Left Bit Shift",
	desc: "Shifts each bit in register (P1) to the left by the amount in register (P2). Fills new bits with 0",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const new_value = (c.getRegister(register_no_1) << c.getRegister(register_no_2)) & 0xff;
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x47, {
	name: "Left Bit Shift",
	desc: "Shifts each bit in register (P1) to the left by the constant value (P2). Fills new bits with 0",
	params: [new RegisParam(""), new ConstParam("")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const new_value = (c.getRegister(register_no_1) << constant_value) & 0xff;
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x48, {
	name: "Right Bit Shift",
	desc: "Shifts each bit in register (P1) to the right by the amount in register (P2). Fills new bits with 0",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const new_value = c.getRegister(register_no_1) >> c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x49, {
	name: "Right Bit Shift",
	desc: "Shifts each bit in register (P1) to the right by the constant value (P2). Fills new bits with 0",
	params: [new RegisParam(""), new ConstParam("")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const new_value = c.getRegister(register_no_1) >> constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x4a, {
	name: "Bitwise NOT",
	desc: "Flips each bit in register (P1)",
	params: [new RegisParam("")],
	execute(c, p) {
		const register_no_1 = p[0];
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
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
	desc: "Adds to the byte in register (P1) with the value in register (P2)",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const sum = c.getRegister(register_no_1) + c.getRegister(register_no_2);
		if (sum > 255) {
			c.setCarry(true);
		}
		c.setRegister(register_no_1, m256(sum));
	},
});

ISA.insertInstruction(0x51, {
	name: "Add",
	desc: "Adds to the byte in register (P1) with the value in register (P2)",
	params: [new RegisParam("set this register to"), new ConstParam("it's sum with this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const sum = c.getRegister(register_no_1) + constant_value;
		if (sum > 255) c.setCarry(true);
		c.setRegister(register_no_1, m256(sum));
	},
});

ISA.insertInstruction(0x52, {
	name: "Subtract",
	desc: "Subtracts from the value in register (P1) by the value in register (P2)",
	params: [new NibbleRegisPairParam("", "R", "R")],
	execute(c, p) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);

		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const difference = c.getRegister(register_no_1) - c.getRegister(register_no_2);
		if (difference < 0) {
			c.setCarry(true);
		}
		c.setRegister(register_no_1, m256(difference));
	},
});

ISA.insertInstruction(0x53, {
	name: "Subtract",
	desc: "Subtracts from the value in register (P1) by the constant value (P2)",
	params: [new RegisParam("set this register to"), new ConstParam("it's difference with this constant")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const difference = c.getRegister(register_no_1) - constant_value;
		if (difference < 0) c.setCarry(true);
		c.setRegister(register_no_1, m256(difference));
	},
});

ISA.insertInstruction(0x54, {
	name: "Multiply",
	desc: "Multiplies the value in register (P1) by value in register (P2)",
	params: [new RegisParam("TODO"), new RegisParam("TODO")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const product = c.getRegister(register_no_1) * c.getRegister(register_no_2);
		c.setRegister(register_no_1, m256(product));
	},
});
ISA.insertInstruction(0x55, {
	name: "Multiply",
	desc: "Multiplies the value in register (P1) by constant value (P2)",
	params: [new RegisParam("TODO"), new ConstParam("TODO")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const product = c.getRegister(register_no_1) * constant_value;
		c.setRegister(register_no_1, m256(product));
	},
});
ISA.insertInstruction(0x56, {
	name: "Divide",
	desc: "Divides the value in register (P1) by value in register (P2)",
	params: [new RegisParam("TODO"), new RegisParam("TODO")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const numerator = c.getRegister(register_no_1);
		const denominator = c.getRegister(register_no_2);
		if (denominator === 0) {
			return { err: "divide_zero", register: register_no_2 };
		}
		const quotient = Math.floor(numerator / denominator);
		c.setRegister(register_no_1, m256(quotient));
	},
});
ISA.insertInstruction(0x57, {
	name: "Divide",
	desc: "Divides the value in register (P1) by constant value (P2)",
	params: [new RegisParam("TODO"), new ConstParam("TODO")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const numerator = c.getRegister(register_no_1);
		if (constant_value === 0) {
			return { err: "divide_zero" };
		}
		const quotient = Math.floor(numerator / constant_value);
		c.setRegister(register_no_1, m256(quotient));
	},
});

ISA.insertInstruction(0x5e, {
	name: "Increment",
	desc: "Increments the value within register (P1) by 1",
	params: [new RegisParam("register to be incremented")],
	execute(c, p) {
		const register_no_1 = p[0];
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const current_value = c.getRegister(register_no_1);
		const incremented = current_value + 1;
		if (incremented > 255) c.setCarry(true);
		c.setRegister(register_no_1, m256(incremented));
	},
});

ISA.insertInstruction(0x5f, {
	name: "Decrement",
	desc: "Decrements the value within register (P1) by 1",
	params: [new RegisParam("register to be decremented")],
	execute(c, p) {
		const register_no_1 = p[0];
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const current_value = c.getRegister(register_no_1);
		const decremented = current_value - 1;
		if (decremented < 0) c.setCarry(true);
		c.setRegister(register_no_1, m256(decremented) as u8);
	},
});

// IO

ISA.insertInstruction(0xf0, {
	name: "Random Number",
	desc: "Sets register (R1) to a random value",
	params: [new RegisParam("register")],
	execute(c, p, e) {
		const [register_no_1] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		// Math.random returns a value  n: 0 =< n < 1, thus
		// floor(n * 256): 0 =< floor(n * 256) < 256
		// Mod256 it just for safety
		const value = m256(Math.floor(Math.random() * 256));
		c.setRegister(register_no_1, value);
	},
});

// Screen

ISA.insertInstruction(0xff, {
	name: "Set Pixel",
	desc: "Sets the color constant (P2) for pixel at position in register (P1)",
	params: [new RegisParam("Pixel Id"), new ConstParam("Pixel Value")],
	execute(c, p, e) {
		const [register_no_1, pixel_val] = p;
		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		const pixel_no = c.getRegister(register_no_1);
		c.setVram(pixel_no, pixel_val);
	},
});

ISA.insertInstruction(0xfe, {
	name: "Set Pixel",
	desc: "Sets the color value in register (P2) for pixel at position in register (P1)",
	params: [new NibbleRegisPairParam("", "RM", "R")],
	execute(c, p, e) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);

		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const pixel_no = c.getRegister(register_no_1);
		const pixel_val = c.getRegister(register_no_2);
		c.setVram(pixel_no, pixel_val);
	},
});

ISA.insertInstruction(0xfd, {
	name: "Get Pixel",
	desc: "Stores the color value for pixel addressed in (R1) to register (R2)",
	params: [new NibbleRegisPairParam("", "RM", "R")],
	execute(c, p, e) {
		const [nibbles] = p;
		const [register_no_1, register_no_2] = splitNibbles(nibbles);

		if (!isU3(register_no_1)) return { err: "invalid_register", no: register_no_1 };
		if (!isU3(register_no_2)) return { err: "invalid_register", no: register_no_2 };
		const pixel_no = c.getRegister(register_no_1);
		const value = c.getVram(pixel_no);
		c.setRegister(register_no_2, value);
	},
});
