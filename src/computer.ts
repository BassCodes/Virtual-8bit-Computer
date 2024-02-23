import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { byte_array_to_js_source, format_hex } from "./etc";
import { Instruction, ISA } from "./instructionSet";
import { m256, u1, u3, u8 } from "./num";

export type TempInstrState = {
	pos: u8;
	params_found: number;
	instr: Instruction;
	params: Array<u8>;
};

export class Computer {
	private memory: Uint8Array = new Uint8Array(256);
	private vram: Uint8Array = new Uint8Array(256);
	private registers: Uint8Array = new Uint8Array(8);
	private call_stack: Array<u8> = [];
	private program_counter: u8 = 0;
	private bank: u1 = 0;
	private current_instr: TempInstrState | null = null;
	events: CpuEventHandler = new CpuEventHandler();

	constructor() {
		// Add events
		for (const [, e_type] of Object.entries(CpuEvent)) {
			this.events.register_event(e_type as CpuEvent);
		}
		this.events.seal();
	}

	cycle(): void {
		const current_byte = this.getMemorySilent(this.program_counter, 0);

		if (this.current_instr === null) {
			const parsed_instruction = ISA.getInstruction(current_byte);
			if (parsed_instruction === null) {
				this.events.dispatch(CpuEvent.InvalidParsed, {
					pos: this.program_counter,
					code: current_byte,
				});
				console.log(`Invalid instruction: ${format_hex(current_byte)}`);
				this.step_forward();
				this.events.dispatch(CpuEvent.Cycle);
				return;
			}
			this.current_instr = {
				pos: this.program_counter,
				instr: parsed_instruction,
				params_found: 0,
				params: new Array<u8>(parsed_instruction.params.length),
			};
			this.events.dispatch(CpuEvent.InstructionParsed, {
				pos: this.program_counter,
				instr: parsed_instruction,
				code: current_byte,
			});
		}

		if (this.current_instr.pos === this.program_counter && this.current_instr.params.length > 0) {
			this.step_forward();
			this.events.dispatch(CpuEvent.Cycle);
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
				this.events.dispatch(CpuEvent.Cycle);
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
		this.events.dispatch(CpuEvent.Cycle);
	}
	private getMemorySilent(address: u8, bank_override?: u1): u8 {
		const banks = [this.memory, this.vram];

		const bank = banks[bank_override ?? this.bank];
		const value = bank[address] as u8;

		return value;
	}

	getMemory(address: u8, bank_override?: u1): u8 {
		const value = this.getMemorySilent(address, bank_override);
		this.events.dispatch(CpuEvent.MemoryAccessed, { address, bank: this.bank, value });
		return value;
	}

	setMemory(address: u8, value: u8): void {
		let bank: Uint8Array | undefined;
		if (this.bank === 0) {
			bank = this.memory;
		} else if (this.bank === 1) {
			bank = this.vram;
		} else {
			const _: never = this.bank;
		}
		if (bank === undefined) {
			throw new Error("unreachable");
		}
		bank[address] = value;
		this.events.dispatch(CpuEvent.MemoryChanged, { address, bank: this.bank, value });
	}

	getRegister(register_no: u3): u8 {
		return this.registers[register_no] as u8;
	}

	setRegister(register_no: u3, value: u8): void {
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

	setBank(bank_no: u1): void {
		this.events.dispatch(CpuEvent.SwitchBank, { bank: bank_no });
		this.bank = bank_no;
	}

	reset(): void {
		this.events.dispatch(CpuEvent.Reset);
		this.memory = new Uint8Array(256);
		this.registers = new Uint8Array(8);
		this.call_stack = [];
		this.current_instr = null;
		this.program_counter = 0;
	}

	init_events(ui: UiEventHandler): void {
		ui.listen(UiEvent.RequestCpuCycle, (cycle_count) => {
			for (let i = 0; i < cycle_count; i++) this.cycle();
		});
		ui.listen(UiEvent.RequestMemoryChange, ({ address, value }) => this.setMemory(address, value));
	}

	load_memory(program: Array<u8>): void {
		console.log(byte_array_to_js_source(program));
		const max_loop: u8 = Math.min(255, program.length) as u8;
		for (let i: u8 = 0; i < 255; i++) {
			// Don't fire event if no change is made
			if (this.memory[i] === program[i]) continue;

			this.memory[i] = program[i];
			this.events.dispatch(CpuEvent.MemoryChanged, { address: i as u8, bank: 0, value: program[i] });
		}
		this.program_counter = 0;
	}

	dump_memory(): Uint8Array {
		return this.memory;
	}

	private step_forward(): void {
		this.program_counter = m256(this.program_counter + 1);
		this.events.dispatch(CpuEvent.ProgramCounterChanged, { counter: this.program_counter });
	}
}
