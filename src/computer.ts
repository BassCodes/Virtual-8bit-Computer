import { u8, $ } from "./etc";

// Set R1 to 255, then print R1, then go back to beginning

export enum Instr {
	NoOp,
	Goto,
	GotoIfLowBit,
	LoadToRegister,
	WriteToMem,
	CopyRegReg,
	AssignRegister,
	Add,
	And,
	Or,
	Not,
	LeftBitShift,
	RightBitShift,
	Equals,
	LessThan,
	GreaterThan,
	Print,
	PrintASCII,
	HaltCatchFire,
}

const InstParamCount = new Map();

InstParamCount.set(Instr.NoOp, 0);
InstParamCount.set(Instr.Goto, 1);
InstParamCount.set(Instr.GotoIfLowBit, 2);
InstParamCount.set(Instr.LoadToRegister, 2);
InstParamCount.set(Instr.WriteToMem, 2);
InstParamCount.set(Instr.CopyRegReg, 2);
InstParamCount.set(Instr.AssignRegister, 2);
InstParamCount.set(Instr.Add, 2);

InstParamCount.set(Instr.And, 2);
InstParamCount.set(Instr.Or, 2);
InstParamCount.set(Instr.Not, 1);
InstParamCount.set(Instr.LeftBitShift, 2);
InstParamCount.set(Instr.RightBitShift, 2);

InstParamCount.set(Instr.Equals, 3);
InstParamCount.set(Instr.LessThan, 3);
InstParamCount.set(Instr.GreaterThan, 3);

InstParamCount.set(Instr.Print, 1);
InstParamCount.set(Instr.PrintASCII, 1);
InstParamCount.set(Instr.HaltCatchFire, 0);

export type TempInstrState = {
	pos: u8;
	params_found: number;
	instr: Instr;
	params: Uint8Array;
};
export type ComputerState = {
	memory: Uint8Array;
	program_counter: u8;
	registers: Uint8Array;
	current_instruction: TempInstrState | null;
};

export class Computer {
	private memory: Uint8Array;
	private program_counter: u8;
	private registers: Uint8Array;
	private current_instr: TempInstrState | null;

	private state_change_callback: (c: ComputerState) => void;
	constructor(callback: (c: ComputerState) => void) {
		// 256 bytes for both program and general purpose memory.
		this.memory = new Uint8Array(256);
		this.registers = new Uint8Array(8);
		this.program_counter = 0;
		this.current_instr = null;

		this.state_change_callback = callback;
	}

	cycle(): void {
		const current_byte = this.memory[this.program_counter];

		if (this.current_instr === null) {
			const parsed_instruction = Computer.parse_instruction(current_byte);
			if (parsed_instruction === null) {
				// console.log("invalid instruction");
				this.step_forward();
				return;
			}
			const instr_param_count = InstParamCount.get(parsed_instruction);
			this.current_instr = {
				pos: this.program_counter,
				instr: parsed_instruction,
				params_found: 0,
				params: new Uint8Array(instr_param_count),
			};
		}

		if (this.current_instr.pos === this.program_counter) {
			this.step_forward();
			return;
		}

		if (this.current_instr.params.length !== this.current_instr.params_found) {
			this.current_instr.params[this.current_instr.params_found] = current_byte;
			this.current_instr.params_found += 1;
		}

		if (this.current_instr.params.length !== this.current_instr.params_found) {
			this.step_forward();
			return;
		}

		const should_step = this.execute_instruction(this.current_instr);
		this.current_instr = null;

		if (should_step) {
			this.step_forward();
		} else {
			this.state_change_callback(this.get_state());
		}
	}

	private execute_instruction(inst: TempInstrState): boolean {
		const instr_param_count = InstParamCount.get(inst.instr);
		const current_pram_count = inst.params.length;
		if (instr_param_count !== current_pram_count) {
			throw new Error(
				`Tried executing instruction #${inst.instr} without proper parameters. (has ${current_pram_count}, needs ${instr_param_count})`
			);
		}

		switch (inst.instr) {
			case Instr.Print: {
				const [register_no] = inst.params;
				const value = this.registers[register_no];
				// console.log(value);
				break;
			}
			case Instr.Goto: {
				const [parameter] = inst.params;
				// console.log(`Goto ${parameter}`);
				this.program_counter = parameter;
				return false;
			}
			case Instr.GotoIfLowBit: {
				const [mem_address, register_no] = inst.params;
				if (this.registers[register_no] % 2 === 1) {
					this.program_counter = mem_address;
					return false;
				}
				return true;
			}
			case Instr.AssignRegister: {
				const [register_no, new_value] = inst.params;
				if (register_no >= this.registers.length) {
					throw new Error(`Got register number ${register_no} in assign register`);
				}
				// console.log(`Set register ${register_no} to ${new_value}`);
				this.registers[register_no] = new_value;
				break;
			}
			case Instr.LoadToRegister: {
				const [register_no, mem_address] = inst.params;
				this.registers[register_no] = this.memory[this.registers[mem_address]];
				break;
			}
			case Instr.WriteToMem: {
				const [register_no, mem_address] = inst.params;
				this.memory[mem_address] = this.memory[this.registers[mem_address]];
				break;
			}
			case Instr.Add: {
				const [register_1, register_2] = inst.params;
				this.registers[register_1] += this.registers[register_2];
				break;
			}
			case Instr.And: {
				const [register_no_1, register_no_2] = inst.params;
				this.registers[register_no_1] &= this.registers[register_no_2];
				break;
			}
			case Instr.Or: {
				const [register_no_1, register_no_2] = inst.params;
				this.registers[register_no_1] |= this.registers[register_no_2];
				break;
			}
			case Instr.Not: {
				const [register_no_1] = inst.params;
				this.registers[register_no_1] = ~this.registers[register_no_1];
				break;
			}
			case Instr.LeftBitShift: {
				const [register_no_1, register_no_2] = inst.params;
				this.registers[register_no_1] <<= this.registers[register_no_2];
				break;
			}
			case Instr.RightBitShift: {
				const [register_no_1, register_no_2] = inst.params;
				this.registers[register_no_1] >>= this.registers[register_no_2];
				break;
			}
			case Instr.Equals: {
				const [register_out, register_no_1, register_no_2] = inst.params;
				if (this.registers[register_no_1] === this.registers[register_no_2]) {
					this.registers[register_out] = 0x01;
				} else {
					this.registers[register_out] = 0x00;
				}
				break;
			}
			case Instr.LessThan: {
				const [register_out, register_no_1, register_no_2] = inst.params;
				if (this.registers[register_no_1] < this.registers[register_no_2]) {
					this.registers[register_out] = 0x01;
				}
				break;
			}
			case Instr.GreaterThan: {
				const [register_out, register_no_1, register_no_2] = inst.params;
				if (this.registers[register_no_1] > this.registers[register_no_2]) {
					this.registers[register_out] = 0x01;
				}
				break;
			}
			case Instr.PrintASCII: {
				const [register_num] = inst.params;
				const ASCIIbyte = this.registers[register_num];

				const char = String.fromCharCode(ASCIIbyte);

				// console.log(char);
				$("printout").textContent += char;
				break;
			}
			case Instr.HaltCatchFire: {
				throw new Error("FIRE FIRE FIRE FIRE");
			}
			case Instr.CopyRegReg: {
				const [register_no_to, register_no_from] = inst.params;
				this.registers[register_no_to] = this.registers[register_no_from];
				break;
			}
			default:
				break;
		}
		return true;
	}

	load_program(program: Array<u8>): void {
		const max_loop = Math.min(this.memory.length, program.length);
		for (let i = 0; i < max_loop; i++) {
			this.memory[i] = program[i];
		}
		this.program_counter = 0;
		this.state_change_callback(this.get_state());
	}

	private step_forward(): void {
		this.program_counter = (this.program_counter + 1) % 256;
		this.state_change_callback(this.get_state());
	}

	get_state(): ComputerState {
		return {
			memory: this.memory,
			program_counter: this.program_counter,
			registers: this.registers,
			current_instruction: this.current_instr,
		};
	}

	static parse_instruction(byte: u8): null | Instr {
		if (byte === 0x00) return Instr.NoOp;
		if (byte === 0x10) return Instr.Goto;
		if (byte === 0x11) return Instr.GotoIfLowBit;
		if (byte === 0x20) return Instr.LoadToRegister;
		if (byte === 0x21) return Instr.WriteToMem;
		if (byte === 0x2f) return Instr.AssignRegister;
		if (byte === 0x28) return Instr.CopyRegReg;

		if (byte === 0x40) return Instr.Add;

		if (byte === 0x48) return Instr.And;
		if (byte === 0x49) return Instr.Or;
		if (byte === 0x4a) return Instr.Not;
		if (byte === 0x4b) return Instr.LeftBitShift;
		if (byte === 0x4c) return Instr.RightBitShift;

		if (byte === 0x50) return Instr.Equals;
		if (byte === 0x51) return Instr.LessThan;
		if (byte === 0x51) return Instr.GreaterThan;

		if (byte === 0xff) return Instr.Print;
		if (byte === 0xfe) return Instr.PrintASCII;
		if (byte === 0x66) return Instr.HaltCatchFire;
		return null;
	}
}
