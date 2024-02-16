import { CpuEvent, MemoryCellType } from "./events";
import { u8 } from "./etc";
import { EventHandler } from "./eventHandler";
import { ConstParam, Instruction, ISA, MemorParam, RegisParam } from "./instructionSet";

export type TempInstrState = {
	pos: u8;
	params_found: number;
	instr: Instruction;
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
	events: EventHandler<CpuEvent>;

	constructor() {
		// 256 bytes for both program and general purpose memory.
		this.memory = new Uint8Array(256);
		// 8 registers
		this.registers = new Uint8Array(8);
		this.program_counter = 0;
		this.current_instr = null;
		this.events = new EventHandler<CpuEvent>();

		// Add events
		for (const [, e_type] of Object.entries(CpuEvent)) {
			this.events.register_event(e_type as CpuEvent);
		}
		this.events.seal();
	}

	cycle(): void {
		const current_byte = this.memory[this.program_counter];
		if (this.current_instr === null) {
			const parsed_instruction = ISA.getInstruction(current_byte);
			if (parsed_instruction === null) {
				this.events.dispatch(CpuEvent.MemoryByteParsed, {
					type: MemoryCellType.InvalidInstruction,
					pos: this.program_counter,
				});
				console.log(`Invalid instruction: ${current_byte.toString(16).toUpperCase().padStart(2, "0")}`);
				this.step_forward();
				return;
			}
			this.current_instr = {
				pos: this.program_counter,
				instr: parsed_instruction,
				params_found: 0,
				params: new Uint8Array(parsed_instruction.params.length),
			};
			this.events.dispatch(CpuEvent.MemoryByteParsed, {
				type: MemoryCellType.Instruction,
				pos: this.program_counter,
				instr: parsed_instruction,
			});
		}

		if (this.current_instr.pos === this.program_counter && this.current_instr.params.length > 0) {
			this.step_forward();
			return;
		}

		if (this.current_instr.params.length !== this.current_instr.params_found) {
			let a;
			const b = this.current_instr.instr.params[this.current_instr.params_found];
			if (b instanceof ConstParam) {
				a = MemoryCellType.Constant;
			} else if (b instanceof RegisParam) {
				a = MemoryCellType.Register;
			} else if (b instanceof MemorParam) {
				a = MemoryCellType.Memory;
			}
			this.events.dispatch(CpuEvent.MemoryByteParsed, { type: a, pos: this.program_counter, param: b });
			this.current_instr.params[this.current_instr.params_found] = current_byte;
			this.current_instr.params_found += 1;
			if (this.current_instr.params.length !== this.current_instr.params_found) {
				this.step_forward();
				return;
			}
		}
		const execution_post_action_state = {
			should_step: true,
			noStep: function (): void {
				this.should_step = false;
			},
			event: this.events.dispatch.bind(this.events),
		};
		this.current_instr.instr.execute(this, this.current_instr.params, execution_post_action_state);

		this.current_instr = null;

		if (execution_post_action_state.should_step) {
			this.step_forward();
		}
	}

	getMemory(address: u8): u8 {
		return this.memory[address];
	}
	setMemory(address: u8, value: u8): void {
		this.events.dispatch(CpuEvent.MemoryChanged, { address, value });
		this.memory[address] = value;
	}

	getRegister(register_no: u8): u8 {
		return this.registers[register_no];
	}
	setRegister(register_no: u8, value: u8): void {
		this.events.dispatch(CpuEvent.RegisterChanged, { register_no, value });
		this.registers[register_no] = value;
	}

	getProgramCounter(): u8 {
		return this.program_counter;
	}
	setProgramCounter(new_value: u8): void {
		this.events.dispatch(CpuEvent.ProgramCounterChanged, { counter: new_value });
		this.program_counter = new_value;
	}

	reset(): void {
		this.memory = new Uint8Array(256);
		this.registers = new Uint8Array(8);
		this.current_instr = null;
		this.program_counter = 0;
		this.events.dispatch(CpuEvent.Reset, null);
	}

	load_memory(program: Array<u8>): void {
		const max_loop = Math.min(this.memory.length, program.length);
		for (let i = 0; i < max_loop; i++) {
			this.memory[i] = program[i];
			this.events.dispatch(CpuEvent.MemoryChanged, { address: i, value: program[i] });
		}
		this.program_counter = 0;
	}

	private step_forward(): void {
		this.program_counter = (this.program_counter + 1) % 256;
		this.events.dispatch(CpuEvent.ProgramCounterChanged, { counter: this.program_counter });
	}
}
