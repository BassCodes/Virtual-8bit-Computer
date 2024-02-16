import { CpuEvent } from "./events";
import { u8 } from "./etc";

class ParameterType {
	readonly description: string;
	constructor(description: string) {
		this.description = description;
	}
}

export class ConstParam extends ParameterType {}
export class RegisParam extends ParameterType {}
export class MemorParam extends ParameterType {}

interface GenericComputer {
	getMemory: (address: u8) => u8;
	setMemory: (address: u8, value: u8) => void;
	setProgramCounter: (address: u8) => void;
	getProgramCounter: () => u8;
	getRegister: (number: u8) => u8;
	setRegister: (number: u8, value: u8) => void;
}

interface AfterExecutionComputerAction {
	// Does not step forward the program counter
	noStep: () => void;
	event: (e: CpuEvent, data: unknown) => void;
}

export interface Instruction {
	readonly name: string;
	readonly desc: string;
	readonly params: Array<ParameterType>;
	execute: (computer_reference: GenericComputer, parameters: Uint8Array, a: AfterExecutionComputerAction) => void;
}

export class InstructionSet {
	instructions: Map<u8, Instruction>;

	constructor() {
		this.instructions = new Map();
	}

	insertInstruction(hexCode: u8, instruction: Instruction): void {
		if (this.instructions.has(hexCode)) {
			throw new Error(`Instruction "${hexCode.toString(16)}" already exists`);
		}
		this.instructions.set(hexCode, instruction);
	}

	getInstruction(hexCode: u8): Instruction | null {
		return this.instructions.get(hexCode) ?? null;
	}
}

export const ISA = new InstructionSet();

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
	desc: "Sets the byte in register (P1) to be the contents of memory cell (P2)",
	params: [new RegisParam(""), new MemorParam("")],
	execute(c, p) {
		const [register_no, mem_address] = p;
		c.setRegister(register_no, c.getMemory(mem_address));
	},
});

ISA.insertInstruction(0x21, {
	name: "SaveToMemory",
	desc: "Writes the byte in register (P1) to the processing memory location (P2)",
	params: [new RegisParam(""), new MemorParam("")],
	execute(c, p) {
		const [register_no, mem_address] = p;
		c.setMemory(mem_address, c.getRegister(register_no));
	},
});

ISA.insertInstruction(0x2f, {
	name: "AssignRegister",
	desc: "Assigns constant value (P2) to register (P1)",
	params: [new RegisParam(""), new ConstParam("")],
	execute(c, p) {
		const [register_no, value] = p;
		c.setRegister(register_no, value);
	},
});

ISA.insertInstruction(0x11, {
	name: "GotoIfLowBit",
	desc: "Moves the CPU instruction counter to the value in (P1) if the value in register (P2) has the lowest bit true",
	params: [new ConstParam("new instruction counter location"), new RegisParam("Register to check")],
	execute(c, p, a) {
		const [new_address, check_register_no] = p;
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
		const current_value = c.getRegister(register_no);
		c.setRegister(register_no, current_value + 1);
	},
});

ISA.insertInstruction(0x31, {
	name: "Decrement",
	desc: "Decrements the value within register (P1) by 1",
	params: [new RegisParam("register to be decremented")],
	execute(c, p) {
		const register_no = p[0];
		const current_value = c.getRegister(register_no);
		c.setRegister(register_no, current_value - 1);
	},
});

ISA.insertInstruction(0x40, {
	name: "Add",
	desc: "Adds the contents of (P1) and (P2) and stores result to register (P1). (Overflow will be taken mod 256)",
	params: [new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2] = p;
		const new_value = (c.getRegister(register_no_1) + c.getRegister(register_no_2)) % 256;
		c.setRegister(register_no_1, new_value);
	},
});

ISA.insertInstruction(0x50, {
	name: "Equals",
	desc: "If byte in register (P1) equals byte in register (P2), set byte in register (P3) to 0x01",
	params: [new RegisParam(""), new RegisParam(""), new RegisParam("")],
	execute(c, p) {
		const [register_no_1, register_no_2, register_no_3] = p;
		const truth = c.getRegister(register_no_1) === c.getRegister(register_no_2) ? 0x01 : 0x00;
		c.setRegister(register_no_3, truth);
	},
});

ISA.insertInstruction(0xfe, {
	name: "PrintASCII",
	desc: "Prints the ASCII byte in register (P1) to console",
	params: [new RegisParam("")],
	execute(c, p, a) {
		const register_no = p[0];
		const asciiByte = c.getRegister(register_no);

		const char = String.fromCharCode(asciiByte);
		a.event(CpuEvent.Print, { data: char });
	},
});
