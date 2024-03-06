/**
 * @file CPU instruction definitions & type definitions for parameters and instructions
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { CpuEvent, CpuEventHandler } from "./events";
import { format_hex, in_range } from "./etc";
import { isU2, isU3, m256, u2, u3, u8 } from "./num";

export enum ParamType {
	Const,
	Register,
	Memory,
}

export abstract class ParameterType {
	readonly desc: string;
	readonly type: ParamType;
	constructor(description: string, p_type: ParamType) {
		this.desc = description;
		this.type = p_type;
	}
}

class ConstParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.Const);
	}
}
class RegisParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.Register);
	}
}
class MemorParam extends ParameterType {
	constructor(d: string) {
		super(d, ParamType.Memory);
	}
}

interface GenericComputer {
	getMemory: (address: u8) => u8;
	setMemory: (address: u8, value: u8) => void;
	setProgramCounter: (address: u8) => void;
	getProgramCounter: () => u8;
	getRegister: (number: u3) => u8;
	setRegister: (number: u3, value: u8) => void;
	pushCallStack: (address: u8) => boolean;
	popCallStack: () => u8 | null;
	setBank: (bank_no: u2) => void;
	getCarry(): boolean;
	setCarry(state: boolean): void;
}

interface AfterExecutionComputerAction {
	// Does not step forward the program counter
	noStep: () => void;
	dispatch: CpuEventHandler["dispatch"];
}

export interface Instruction {
	readonly name: string;
	readonly desc: string;
	readonly params: Array<ParameterType>;
	readonly execute: (
		computer_reference: GenericComputer,
		parameters: Array<u8>,
		a: AfterExecutionComputerAction
	) => void;
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
			throw new Error(`Instruction "${format_hex(hexCode)}" already exists`);
		}
		this.instructions.set(hexCode, instruction);
	}

	addCategory(c: InstrCategory): void {
		// Check for overlap with existing ranges
		for (const r of this.category_ranges) {
			if (in_range(c.start, r.start, r.end) || in_range(c.end, r.start, r.end)) {
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
	name: "Copy R -> M",
	desc: "Copy the byte in register (P1) to the memory address (P2)",
	params: [new RegisParam("Write the byte in this register"), new MemorParam("To this memory address")],
	execute(c, p) {
		const [register_no, mem_address] = p;
		if (!isU3(register_no)) throw new Error("TODO");
		c.setMemory(mem_address, c.getRegister(register_no));
	},
});

ISA.insertInstruction(0x11, {
	name: "Copy M -> R",
	desc: "Copy the byte in memory address (P1) to the register (P2)",
	params: [new MemorParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no, mem_address] = p;
		if (!isU3(register_no)) throw new Error("TODO");
		c.setRegister(register_no, c.getMemory(mem_address));
	},
});

ISA.insertInstruction(0x12, {
	name: "Copy M -> M",
	desc: "Copy the byte in memory address (P1) to memory address (P2)",
	params: [new MemorParam("Copy the byte in this memory address"), new MemorParam("To this memory address")],
	execute(c, p) {
		const [mem_address_1, mem_address_2] = p;
		c.setMemory(mem_address_2, c.getMemory(mem_address_1));
	},
});

ISA.insertInstruction(0x13, {
	name: "Copy R -> R",
	desc: "Copy the byte in register (P1) to register (P2)",
	params: [new RegisParam("Copy the byte in this register"), new RegisParam("To this register")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("todo");
		if (!isU3(register_no_2)) throw new Error("todo");
		c.setRegister(register_no_2, c.getRegister(register_no_1));
	},
});
ISA.insertInstruction(0x14, {
	name: "Load RM -> R",
	desc: "Copy the byte in memory addressed by register (P1) to register (P2)",
	params: [
		new RegisParam("Copy the byte in the memory cell addressed in this register"),
		new RegisParam("To this register"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("todo");
		if (!isU3(register_no_2)) throw new Error("todo");
		c.setRegister(register_no_2, c.getMemory(c.getRegister(register_no_1)));
	},
});
ISA.insertInstruction(0x15, {
	name: "Save R -> RM",
	desc: "Copy the byte in register (P1) to the memory cell addressed in register (P2)",
	params: [
		new RegisParam("Copy the value in this register"),
		new RegisParam("To the memory cell addressed in this register"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("todo");
		if (!isU3(register_no_2)) throw new Error("todo");
		c.setMemory(c.getRegister(register_no_2), c.getRegister(register_no_1));
	},
});

ISA.insertInstruction(0x17, {
	name: "Zero Register",
	desc: "Set the byte in register (P1) to 0",
	params: [new RegisParam("Set the value in this register to 0")],
	execute(c, p) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("todo");
		c.setRegister(register_no, 0);
	},
});
ISA.insertInstruction(0x18, {
	name: "Zero Memory",
	desc: "Set the byte in memory address (P1) to 0",
	params: [new RegisParam("Set the value in this memory address to 0")],
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
		const [register_no, value] = p;
		if (!isU3(register_no)) throw new Error("TODO");
		c.setRegister(register_no, value);
	},
});

ISA.insertInstruction(0x1f, {
	name: "Set bank",
	desc: "Selects which bank of memory to write and read to",
	params: [new ConstParam("Bank number")],
	execute(c, p) {
		const bank_no = p[0];
		if (!isU2(bank_no)) {
			throw new Error("TODO");
		}
		c.setBank(bank_no);
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
	execute: (c, p, a) => {
		const register_no = p[0];
		if (!isU3(register_no)) {
			throw new Error("todo");
		}
		const new_address = c.getRegister(register_no);
		c.setProgramCounter(new_address);
		a.noStep();
	},
});

ISA.insertInstruction(0x21, {
	name: "Goto",
	desc: "Moves the CPU instruction counter to the value in (P1)",
	params: [new ConstParam("new instruction counter location")],
	execute: (c, p, a) => {
		const new_address = p[0];
		c.setProgramCounter(new_address);
		a.noStep();
	},
});

ISA.insertInstruction(0x22, {
	name: "Goto if True",
	desc: "Moves the instruction counter to the value in register (P2) if the value in register (P1) is true",
	params: [new RegisParam(""), new RegisParam("")],
	execute: (c, p, a) => {
		const register_no_1 = p[0];
		if (!isU3(register_no_1)) throw new Error("todo");
		const bool = c.getRegister(register_no_1);
		if (!bool) return;
		const register_no_2 = p[1];
		if (!isU3(register_no_2)) throw new Error("todo");
		const new_address = c.getRegister(register_no_2);
		c.setProgramCounter(new_address);
		a.noStep();
	},
});

ISA.insertInstruction(0x23, {
	name: "Goto if True",
	desc: "Moves the instruction counter to the value in (P2) if the value in register (P1) is true",
	params: [new RegisParam(""), new ConstParam("")],
	execute: (c, p, a) => {
		const [register_no, constant_value] = p;
		if (!isU3(register_no)) throw new Error("todo");
		const bool = c.getRegister(register_no);
		if (!bool) return;
		c.setProgramCounter(constant_value);
		a.noStep();
	},
});

ISA.insertInstruction(0x28, {
	name: "Goto if Carry Flag set",
	desc: "Moves the instruction counter to the value in register (P1) if CPU Carry flag is true",
	params: [new RegisParam("")],
	execute: (c, p, a) => {
		if (!c.getCarry()) return;
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("todo");
		const register_value = c.getRegister(register_no);
		c.setProgramCounter(register_value);
		a.noStep();
		c.setCarry(false);
	},
});
ISA.insertInstruction(0x29, {
	name: "Goto if Carry Flag set",
	desc: "Moves the instruction counter to the value in (P1) if CPU Carry flag is true",
	params: [new ConstParam("")],
	execute: (c, p, a) => {
		if (!c.getCarry()) return;
		const goto_address = p[0];
		c.setProgramCounter(goto_address);
		a.noStep();
		c.setCarry(false);
	},
});

ISA.insertInstruction(0x2d, {
	name: "Call",
	desc: "",
	params: [new ConstParam("the subroutine at this memory address")],
	execute(c, p, a) {
		const current_address = c.getProgramCounter();
		const success = c.pushCallStack(current_address);
		// TODO Handle success/failure

		const new_address = p[0];
		c.setProgramCounter(new_address);

		a.noStep();
	},
});

ISA.insertInstruction(0x2e, {
	name: "Return",
	desc: "",
	params: [],
	execute(c, p, a) {
		const new_address = c.popCallStack();
		if (new_address === null) throw new Error("TODO handle this");
		c.setProgramCounter(m256(new_address + 1));
		a.noStep();
	},
});

ISA.insertInstruction(0x2c, {
	name: "NoOp",
	desc: "No operation; do nothing",
	params: [],
	execute: () => {},
});

ISA.insertInstruction(0x2f, {
	name: "Halt and Catch Fire",
	desc: "Stops program execu..... Fire! FIRE EVERYWHERE!",
	params: [],
	execute(c, p, a) {
		a.dispatch(CpuEvent.Halt);
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
		new RegisParam("if this register and"),
		new RegisParam("this register are equal (else false)"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, register_no_3] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		if (!isU3(register_no_3)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		const truth = c.getRegister(register_no_2) === constant_value ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});
ISA.insertInstruction(0x32, {
	name: "Less Than",
	desc: "Sets register (P1) to true if value in register (P2) is less than the value in register (P3)",
	params: [
		new RegisParam("Set this register to true"),
		new RegisParam("if this register is less than"),
		new RegisParam("this register"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, register_no_3] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		if (!isU3(register_no_3)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		const truth = c.getRegister(register_no_2) < constant_value ? 0x01 : 0x00;
		c.setRegister(register_no_1, truth);
	},
});
ISA.insertInstruction(0x34, {
	name: "Greater Than",
	desc: "Sets register (P1) to true if value in register (P2) is greater than the value in register (P3)",
	params: [
		new RegisParam("Set this register to true"),
		new RegisParam("if this register is greater than"),
		new RegisParam("this register"),
	],
	execute(c, p) {
		const [register_no_1, register_no_2, register_no_3] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		if (!isU3(register_no_3)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
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
	params: [new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		const new_value = c.getRegister(register_no_1) | constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x42, {
	name: "Bitwise AND",
	desc: "Sets each bit in register (P1) to its AND with the respective bit in register (P2)",
	params: [new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		const new_value = c.getRegister(register_no_1) & constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x44, {
	name: "Bitwise XOR",
	desc: "Sets each bit in register (P1) to its XOR with the respective bit in register (P2)",
	params: [new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		const new_value = c.getRegister(register_no_1) ^ constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x46, {
	name: "Left Bit Shift",
	desc: "Shifts each bit in register (P1) to the left by the amount in register (P2). Fills new bits with 0",
	params: [new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		const new_value = c.getRegister(register_no_1) << c.getRegister(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x47, {
	name: "Left Bit Shift",
	desc: "Shifts each bit in register (P1) to the left by the constant value (P2). Fills new bits with 0",
	params: [new RegisParam(""), new ConstParam("")],
	execute(c, p) {
		const [register_no_1, constant_value] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		const new_value = c.getRegister(register_no_1) << constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});
ISA.insertInstruction(0x48, {
	name: "Right Bit Shift",
	desc: "Shifts each bit in register (P1) to the right by the amount in register (P2). Fills new bits with 0",
	params: [new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		const new_value = c.getRegister(register_no_1) >> constant_value;
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0x4a, {
	name: "Bitwise NOT",
	desc: "Flips each bit in register (P1)",
	params: [new RegisParam("")],
	execute(c, p) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("TODO");
		const new_value = ~c.getRegister(register_no);
		c.setRegister(register_no, new_value as u8);
	},
});

//
// Arithmetic
// 0x50 -> 0x5F
//

ISA.insertInstruction(0x50, {
	name: "Add",
	desc: "Adds to the byte in register (P1) with the value in register (P2)",
	params: [new RegisParam("set this register to"), new RegisParam("it's sum with the value in this register")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		const sum = c.getRegister(register_no_1) + constant_value;
		if (sum > 255) c.setCarry(true);
		c.setRegister(register_no_1, m256(sum));
	},
});

ISA.insertInstruction(0x52, {
	name: "Subtract",
	desc: "Subtracts from the value in register (P1) by the value in register (P2)",
	params: [new RegisParam("set this register to"), new RegisParam("it's difference with the value in this register")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
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
		if (!isU3(register_no_1)) throw new Error("TODO");
		const difference = c.getRegister(register_no_1) + constant_value;
		if (difference < 0) c.setCarry(true);
		c.setRegister(register_no_1, m256(difference));
	},
});

ISA.insertInstruction(0x5e, {
	name: "Increment",
	desc: "Increments the value within register (P1) by 1",
	params: [new RegisParam("register to be incremented")],
	execute(c, p) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("TODO");
		const current_value = c.getRegister(register_no);
		const incremented = current_value + 1;
		if (incremented > 255) c.setCarry(true);
		c.setRegister(register_no, m256(incremented));
	},
});

ISA.insertInstruction(0x5f, {
	name: "Decrement",
	desc: "Decrements the value within register (P1) by 1",
	params: [new RegisParam("register to be decremented")],
	execute(c, p) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("TODO");
		const current_value = c.getRegister(register_no);
		const decremented = current_value - 1;
		if (decremented < 0) c.setCarry(true);
		c.setRegister(register_no, m256(decremented) as u8);
	},
});

//
// IO
// 0xF0 -> 0xFF
//

ISA.insertInstruction(0xf0, {
	name: "PrintASCII",
	desc: "Prints the ASCII byte in register (P1) to console",
	params: [new RegisParam("Register to print from")],
	execute(c, p, a) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("TODO");
		const asciiByte = c.getRegister(register_no);

		const char = String.fromCharCode(asciiByte);
		a.dispatch(CpuEvent.Print, char);
	},
});

ISA.insertInstruction(0xf1, {
	name: "Print",
	desc: "Prints the byte in register (P1) to console as base 10",
	params: [new RegisParam("Register to print from")],
	execute(c, p, a) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("TODO");
		const byte = c.getRegister(register_no);

		a.dispatch(CpuEvent.Print, byte.toString(10));
	},
});
