import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { byte_array_to_js_source, format_hex, u8 } from "./etc";
import { EventHandler } from "./eventHandler";
import { Instruction, ISA } from "./instructionSet";

export type TempInstrState = {
	pos: u8;
	params_found: number;
	instr: Instruction;
	params: Uint8Array;
};

export class Computer {
	private memory = new Uint8Array(256);
	private registers = new Uint8Array(8);
	private call_stack: Array<u8> = [];
	private program_counter: u8 = 0;
	private current_instr: TempInstrState | null = null;
	events: CpuEventHandler = new EventHandler<CpuEvent>() as CpuEventHandler;

	constructor() {
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
				this.events.dispatch(CpuEvent.InvalidParsed, {
					pos: this.program_counter,
					code: current_byte,
				});
				console.log(`Invalid instruction: ${format_hex(current_byte)}`);
				this.step_forward();
				this.events.dispatch(CpuEvent.ClockCycle, null);
				return;
			}
			this.current_instr = {
				pos: this.program_counter,
				instr: parsed_instruction,
				params_found: 0,
				params: new Uint8Array(parsed_instruction.params.length),
			};
			this.events.dispatch(CpuEvent.InstructionParsed, {
				pos: this.program_counter,
				instr: parsed_instruction,
				code: current_byte,
			});
		}

		if (this.current_instr.pos === this.program_counter && this.current_instr.params.length > 0) {
			this.step_forward();
			this.events.dispatch(CpuEvent.ClockCycle, null);
			return;
		}

		if (this.current_instr.params.length !== this.current_instr.params_found) {
			const b = this.current_instr.instr.params[this.current_instr.params_found];

			this.events.dispatch(CpuEvent.ParameterParsed, {
				param: b,
				pos: this.program_counter,
				code: current_byte,
			});
			this.current_instr.params[this.current_instr.params_found] = current_byte;
			this.current_instr.params_found += 1;
			if (this.current_instr.params.length !== this.current_instr.params_found) {
				this.step_forward();
				this.events.dispatch(CpuEvent.ClockCycle, null);
				return;
			}
		}
		const execution_post_action_state = {
			should_step: true,
			noStep: function (): void {
				this.should_step = false;
			},
			dispatch: this.events.dispatch.bind(this.events),
		};
		this.current_instr.instr.execute(this, this.current_instr.params, execution_post_action_state);
		this.events.dispatch(CpuEvent.InstructionExecuted, { instr: this.current_instr.instr });
		this.current_instr = null;

		if (execution_post_action_state.should_step) {
			this.step_forward();
		}
		this.events.dispatch(CpuEvent.ClockCycle, null);
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

	pushCallStack(address: u8): boolean {
		if (this.call_stack.length >= 8) return false;
		this.call_stack.push(address);
		return true;
	}

	popCallStack(): u8 | null {
		return this.call_stack.pop() ?? null;
	}

	reset(): void {
		this.events.dispatch(CpuEvent.Reset, null);
		this.memory = new Uint8Array(256);
		this.registers = new Uint8Array(8);
		this.call_stack = [];
		this.current_instr = null;
		this.program_counter = 0;
	}

	init_events(ui: UiEventHandler): void {
		ui.listen(UiEvent.RequestCpuCycle, (n) => {
			for (let i = 0; i < n; i++) this.cycle();
		});
		ui.listen(UiEvent.RequestMemoryChange, ({ address, value }) => this.setMemory(address, value));
	}

	load_memory(program: Array<u8>): void {
		console.log(byte_array_to_js_source(program));
		const max_loop = Math.min(this.memory.length, program.length);
		for (let i = 0; i < max_loop; i++) {
			// Don't fire event if no change is made
			if (this.memory[i] === program[i]) continue;

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
