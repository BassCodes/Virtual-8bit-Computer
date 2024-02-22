import { CpuEvent, CpuEventHandler } from "./events";
import { format_hex } from "./etc";
import { isU3, m256, u1, u3, u8 } from "./num";

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
	setBank: (bank_no: u1) => void;
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

export class InstructionSet {
	instructions: Map<u8, Instruction>;

	constructor() {
		this.instructions = new Map();
	}

	insertInstruction(hexCode: u8, instruction: Instruction): void {
		if (this.instructions.has(hexCode)) {
			throw new Error(`Instruction "${format_hex(hexCode)}" already exists`);
		}
		this.instructions.set(hexCode, instruction);
	}

	getInstruction(hexCode: u8): Instruction | null {
		return this.instructions.get(hexCode) ?? null;
	}
}

export const ISA = new InstructionSet();

// The definitions for actual instructions.

ISA.insertInstruction(0x00, {
	name: "NoOp",
	desc: "No operation; do nothing",
	params: [],
	execute: () => {},
});

ISA.insertInstruction(0x10, {
	name: "Goto",
	desc: "Moves the CPU instruction counter to the value in (P1)",
	params: [new ConstParam("new instruction counter location")],
	execute: (c, p, a) => {
		const new_address = p[0];
		c.setProgramCounter(new_address);
		a.noStep();
	},
});

ISA.insertInstruction(0x20, {
	name: "LoadToRegister",
	desc: "Sets the byte in register (P1) to be the contents of memory cell at address in register (P2)",
	params: [new RegisParam("Set this register to"), new RegisParam("the byte held in this memory address")],
	execute(c, p) {
		const [register_no, register_2] = p;
		if (!isU3(register_no)) throw new Error("TODO");
		if (!isU3(register_2)) throw new Error("TODO");

		c.setRegister(register_no, c.getMemory(c.getRegister(register_2)));
	},
});

ISA.insertInstruction(0x21, {
	name: "SaveToMemory",
	desc: "Writes the byte in register (P1) to the memory cell (P2)",
	params: [new RegisParam("Write the byte in this register"), new MemorParam("To this memory address")],
	execute(c, p) {
		const [register_no, mem_address] = p;
		if (!isU3(register_no)) throw new Error("TODO");
		c.setMemory(mem_address, c.getRegister(register_no));
	},
});

ISA.insertInstruction(0x2f, {
	name: "AssignRegister",
	desc: "Assigns constant value (P2) to register (P1)",
	params: [new RegisParam("Set this register"), new ConstParam("to this constant")],
	execute(c, p) {
		const [register_no, value] = p;
		if (!isU3(register_no)) throw new Error("TODO");
		c.setRegister(register_no, value);
	},
});

ISA.insertInstruction(0x11, {
	name: "GotoIfLowBitHigh",
	desc: "Moves the CPU instruction counter to the value in (P1) if the value in register (P2) has the lowest bit true",
	params: [new ConstParam("Set program counter to this constant"), new RegisParam("if this register's 1 bit is set")],
	execute(c, p, a) {
		const [new_address, check_register_no] = p;
		if (!isU3(check_register_no)) throw new Error("TODO");
		if (c.getRegister(check_register_no) % 2 === 1) {
			c.setProgramCounter(new_address);
			a.noStep();
		}
	},
});

ISA.insertInstruction(0x30, {
	name: "Increment",
	desc: "Increments the value within register (P1) by 1",
	params: [new RegisParam("register to be incremented")],
	execute(c, p) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("TODO");
		const current_value = c.getRegister(register_no);
		const new_value = m256(current_value + 1);
		c.setRegister(register_no, new_value);
	},
});

ISA.insertInstruction(0x31, {
	name: "Decrement",
	desc: "Decrements the value within register (P1) by 1",
	params: [new RegisParam("register to be decremented")],
	execute(c, p) {
		const register_no = p[0];
		if (!isU3(register_no)) throw new Error("TODO");
		const current_value = c.getRegister(register_no);
		let new_value = current_value - 1;
		if (new_value === -1) {
			new_value = 255;
		}
		c.setRegister(register_no, new_value as u8);
	},
});

ISA.insertInstruction(0x40, {
	name: "Add",
	desc: "Adds the contents of (P1) and (P2) and stores result to register (P1). (Overflow will be taken mod 256)",
	params: [new RegisParam("set this register to"), new RegisParam("it's sum with the value in this register")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		const new_value = m256(c.getRegister(register_no_1) + c.getRegister(register_no_2));
		c.setRegister(register_no_1, new_value);
	},
});

ISA.insertInstruction(0x50, {
	name: "Equals",
	desc: "If byte in register (P2) equals byte in register (P3), set byte in register (P1) to 0x01",
	params: [
		new RegisParam("Set this register to be 0x01"),
		new RegisParam("if this register and"),
		new RegisParam("this register are equal (else 0x00)"),
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

ISA.insertInstruction(0xfe, {
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

ISA.insertInstruction(0x48, {
	name: "Bitwise And",
	desc: "Takes each bit in register (P1) and compares to the respective bit in register (P2). Each bit in register (P1) is set to 1 if the respective bit in both registers are 1",
	params: [new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		if (!isU3(register_no_1)) throw new Error("TODO");
		if (!isU3(register_no_2)) throw new Error("TODO");
		const new_value = c.getRegister(register_no_1) & c.getMemory(register_no_2);
		c.setRegister(register_no_1, new_value as u8);
	},
});

ISA.insertInstruction(0xff, {
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

ISA.insertInstruction(0xfd, {
	name: "Print 16 bit",
	desc: "Prints the byte in register (P1) as the upper half and the byte in register (P2) as the lower half of a 16 bit number. Formats to decimal",
	params: [new RegisParam("Upper 8 bits of number"), new RegisParam("Lower 8 bits of number")],
	execute(c, p, a) {
		const [upper_register_no, lower_register_no] = p;
		if (!isU3(upper_register_no)) throw new Error("TODO");
		if (!isU3(lower_register_no)) throw new Error("TODO");
		const upper = c.getRegister(upper_register_no);
		const lower = c.getRegister(lower_register_no);
		const sum = upper * 16 * 16 + lower;

		a.dispatch(CpuEvent.Print, sum.toString(10));
	},
});

ISA.insertInstruction(0x66, {
	name: "Halt and Catch Fire",
	desc: "Stops program execu..... Fire! FIRE EVERYWHERE!",
	params: [],
	execute(c, p, a) {
		a.dispatch(CpuEvent.Halt, null);
	},
});

ISA.insertInstruction(0xa0, {
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

ISA.insertInstruction(0xa1, {
	name: "Return",
	desc: "",
	params: [],
	execute(c, p, a) {
		const new_address = c.popCallStack();
		if (new_address === null) {
			throw new Error("TODO handle this");
		}

		c.setProgramCounter(m256(new_address + 1));

		a.noStep();
	},
});
ISA.insertInstruction(0xb1, {
	name: "Set bank",
	desc: "Selects which bank of memory to write and read to",
	params: [new ConstParam("Bank number")],
	execute(c, p, a) {},
});
